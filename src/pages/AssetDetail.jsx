import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { AssetDetailSkeleton } from '../components/Skeleton';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';

// ── SMA calculation ──
const calculateSMA = (data, period) => {
  if (data.length < period) return [];
  const results = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }
    results.push({ time: data[i].time, value: sum / period });
  }
  return results;
};

// ── Candle aggregation ──
const aggregateCandles = (data, targetInterval) => {
  if (targetInterval === '1m' || !data.length) return data;
  const stepMinutes = targetInterval === '5m' ? 5 : targetInterval === '1h' ? 60 : 1440;
  const stepSeconds = stepMinutes * 60;
  const aggregated = [];
  let currentGroup = null;

  data.forEach(candle => {
    const groupTime = Math.floor(candle.time / stepSeconds) * stepSeconds;
    if (!currentGroup || currentGroup.time !== groupTime) {
      if (currentGroup) aggregated.push(currentGroup);
      currentGroup = {
        time: groupTime,
        open: candle.open, high: candle.high, low: candle.low, close: candle.close,
        volume: candle.volume || 0
      };
    } else {
      currentGroup.high = Math.max(currentGroup.high, candle.high);
      currentGroup.low = Math.min(currentGroup.low, candle.low);
      currentGroup.close = candle.close;
      currentGroup.volume = (currentGroup.volume || 0) + (candle.volume || 0);
    }
  });
  if (currentGroup) aggregated.push(currentGroup);
  return aggregated;
};

// ── Debounce utility ──
function useDebounce(fn, delay) {
  const timerRef = useRef(null);
  return useCallback((...args) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function AssetDetail() {
  const { id } = useParams();
  const ticker = id || 'BANANA';
  const chartContainerRef = useRef(null);
  const { user, profile, refreshProfile } = useAuth();
  const toast = useToast();

  const [interval, setChartInterval] = useState('5m');
  const [tradeMode, setTradeMode] = useState('buy');
  const [orderType, setOrderType] = useState('Market');
  const [isOrderTypeMenuOpen, setIsOrderTypeMenuOpen] = useState(false);
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [showTpSl, setShowTpSl] = useState(false);
  const [tpPrice, setTpPrice] = useState('');
  const [slPrice, setSlPrice] = useState('');
  const [chartData, setChartData] = useState([]);
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeMsg, setTradeMsg] = useState(null);
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [topHolders, setTopHolders] = useState([]);
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  const balance = profile?.balance ?? 10000;
  const currentAssetPrice = asset ? Number(asset.current_price) : 0;

  // ── Data fetchers ──
  const fetchChartData = async (assetId) => {
    const { data } = await supabase
      .from('price_history')
      .select('*')
      .eq('asset_id', assetId)
      .order('timestamp', { ascending: true })
      .limit(1000);

    let rawData = [];
    if (data && data.length > 0) {
      rawData = data.map(d => ({
        time: Math.floor(new Date(d.timestamp).getTime() / 1000),
        open: Number(d.open), high: Number(d.high), low: Number(d.low), close: Number(d.close),
        volume: Number(d.volume) || 0
      }));
      rawData.sort((a, b) => a.time - b.time);
      // Dedup by time
      const deduped = [];
      rawData.forEach(d => {
        if (deduped.length > 0 && deduped[deduped.length - 1].time === d.time) {
          const prev = deduped[deduped.length - 1];
          prev.high = Math.max(prev.high, d.high);
          prev.low = Math.min(prev.low, d.low);
          prev.close = d.close;
          prev.volume = (prev.volume || 0) + (d.volume || 0);
        } else {
          deduped.push({ ...d });
        }
      });
      rawData = deduped;
    }
    return rawData;
  };

  const fetchRecentTrades = async () => {
    const { data } = await supabase
      .from('trades')
      .select('price, quantity, side, executed_at')
      .eq('ticker', ticker)
      .eq('side', 'buy')
      .order('executed_at', { ascending: false })
      .limit(40);
    if (data) setRecentTrades(data);
  };

  const fetchOrderBook = async (assetId) => {
    const { data, error } = await supabase.rpc('get_order_book', { p_asset_id: assetId });
    if (!error && data) {
      setAsks(data.asks || []);
      setBids(data.bids || []);
    }
  };

  const fetchPendingOrders = async (assetId) => {
    if (!user) return;
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .eq('asset_id', assetId)
      .eq('status', 'PENDING');
    if (data) setPendingOrders(data);
  };

  const fetchTopHolders = async (assetId) => {
    try {
      const { data: holdingsData } = await supabase
        .from('holdings')
        .select('quantity, user_id')
        .eq('asset_id', assetId)
        .gt('quantity', 0)
        .order('quantity', { ascending: false })
        .limit(5);

      if (holdingsData && holdingsData.length > 0) {
        const userIds = holdingsData.map(h => h.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        const enriched = holdingsData
          .map(h => ({
            ...h,
            profiles: profilesData?.find(p => p.id === h.user_id) || { username: 'Anon' }
          }))
          .filter(h => !h.profiles?.username?.startsWith('Market_Maker'));

        setTopHolders(enriched.slice(0, 3));
      } else {
        setTopHolders([]);
      }
    } catch (e) {
      console.warn('Top holders fetch failed:', e);
      setTopHolders([]);
    }
  };

  // Debounced order book fetch
  const debouncedFetchOrderBook = useDebounce((assetId) => fetchOrderBook(assetId), 500);

  // ── Initial data load ──
  useEffect(() => {
    const fetchAsset = async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('ticker', ticker)
        .single();

      if (!error && data) {
        setAsset(data);
        setPrice(Number(data.current_price).toFixed(2));
      }
      setLoading(false);
    };
    fetchAsset();
  }, [ticker]);

  // ── Chart data fetch (depends on asset + interval) ──
  useEffect(() => {
    if (!asset) return;
    const load = async () => {
      const rawData = await fetchChartData(asset.id);
      const aggregated = aggregateCandles(rawData, interval);
      setChartData(padChartData(aggregated, interval === '1m' ? 60 : interval === '5m' ? 40 : interval === '1h' ? 24 : 30, interval));
    };
    load();
  }, [asset, interval]);

  // ── Realtime: Broadcast for live ticks + DB changes for trades ──
  useEffect(() => {
    if (!asset) return;

    fetchRecentTrades();
    fetchOrderBook(asset.id);
    fetchPendingOrders(asset.id);
    fetchTopHolders(asset.id);

    // Broadcast channel for live price ticks (no DB reads!)
    const broadcastChannel = supabase
      .channel('trax-price-stream')
      .on('broadcast', { event: 'price_tick' }, (msg) => {
        const payload = msg.payload;
        if (payload.ticker === ticker) {
          // Update asset price in memory without a DB read
          setAsset(prev => prev ? { ...prev, current_price: payload.price } : prev);
          if (orderType === 'Market') {
            setPrice(payload.price.toFixed(2));
          }
        }
      })
      .subscribe();

    // DB channel for actual trades (these are rare compared to ticks)
    const dbChannel = supabase
      .channel(`trax-trades-${ticker}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets', filter: `ticker=eq.${ticker}` }, (payload) => {
        setAsset(payload.new);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trades', filter: `ticker=eq.${ticker}` }, () => {
        fetchRecentTrades();
        // Refresh chart data from DB
        const refresh = async () => {
          const rawData = await fetchChartData(asset.id);
          const aggregated = aggregateCandles(rawData, interval);
          setChartData(padChartData(aggregated, interval === '1m' ? 60 : interval === '5m' ? 40 : interval === '1h' ? 24 : 30, interval));
        };
        refresh();
      })
      .subscribe();

    // Order book polling (debounced, every 6s)
    const orderBookPoller = setInterval(() => debouncedFetchOrderBook(asset.id), 6000);

    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(dbChannel);
      clearInterval(orderBookPoller);
    };
  }, [asset, ticker, interval, orderType]);

  // ── Pad chart data with flatlines if sparse ──
  const padChartData = (historicalData, targetCount, intervalScale) => {
    if (historicalData.length >= targetCount) return historicalData;
    const padded = [];
    const step = intervalScale === '1m' ? 60 : intervalScale === '5m' ? 300 : intervalScale === '1h' ? 3600 : 86400;
    const padPrice = historicalData.length > 0
      ? historicalData[0].open
      : (currentAssetPrice || Number(asset?.ipo_price) || 10);
    const latestTime = historicalData.length > 0
      ? historicalData[0].time
      : Math.floor(Date.now() / 1000);
    const needed = targetCount - historicalData.length;
    for (let i = needed; i > 0; i--) {
      padded.push({ time: latestTime - (i * step), open: padPrice, high: padPrice, low: padPrice, close: padPrice, volume: 0 });
    }
    return [...padded, ...historicalData];
  };

  // ── Chart refs ──
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const sma20Ref = useRef(null);
  const sma50Ref = useRef(null);
  const volumeRef = useRef(null);

  // ── Initialize Chart Instance ──
  useEffect(() => {
    if (loading) return;
    const chartContainer = chartContainerRef.current;
    if (!chartContainer) return;

    chartContainer.innerHTML = '';

    // Hide TradingView watermark
    const style = document.createElement('style');
    style.textContent = `
      .tv-lightweight-charts a[href*="tradingview"],
      .tv-lightweight-charts div[style*="tradingview"],
      a[target="_blank"][href*="tradingview"] { display: none !important; }
    `;
    chartContainer.appendChild(style);

    const chart = createChart(chartContainer, {
      layout: { background: { color: '#0f0f0f' }, textColor: '#8a8580', fontFamily: "'JetBrains Mono', monospace" },
      grid: { vertLines: { color: '#1a1a1a', style: 1 }, horzLines: { color: '#1a1a1a', style: 1 } },
      crosshair: { mode: 1, vertLine: { width: 1, color: '#3d3a34', style: 0 }, horzLine: { width: 1, color: '#3d3a34', style: 0 } },
      timeScale: { borderColor: '#1a1a1a', timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: '#1a1a1a' },
    });

    // ── Candlestick Series ──
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#4ade80', downColor: '#f87171', borderVisible: false, wickUpColor: '#4ade80', wickDownColor: '#f87171'
    });

    // ── Volume Histogram ──
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
      drawTicks: false,
    });

    // ── SMA 20 Line ──
    const sma20Series = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    // ── SMA 50 Line ──
    const sma50Series = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;
    sma20Ref.current = sma20Series;
    sma50Ref.current = sma50Series;
    volumeRef.current = volumeSeries;

    // Persist chart zoom
    const saveScaleHandler = (range) => {
      if (range) localStorage.setItem(`trax_chart_time_${ticker}_${interval}`, JSON.stringify(range));
    };
    chart.timeScale().subscribeVisibleTimeRangeChange(saveScaleHandler);

    const savedTimeRange = localStorage.getItem(`trax_chart_time_${ticker}_${interval}`);
    if (savedTimeRange) {
      try {
        JSON.parse(savedTimeRange);
        chartContainer.dataset.savedRange = savedTimeRange;
      } catch (e) { }
    }

    const handleResize = () => {
      if (chartContainer) chart.applyOptions({ width: chartContainer.clientWidth, height: chartContainer.clientHeight });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.timeScale().unsubscribeVisibleTimeRangeChange(saveScaleHandler);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      sma20Ref.current = null;
      sma50Ref.current = null;
      volumeRef.current = null;
    };
  }, [loading]);

  // ── Update Chart Data, Indicators, Price Lines ──
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || chartData.length === 0) return;

    const chart = chartRef.current;
    const candleSeries = seriesRef.current;

    const currentRange = chart.timeScale().getVisibleLogicalRange();

    // Deduplicate and map to local time
    const uniqueTimeData = [];
    const seenTimes = new Set();
    chartData.forEach(d => {
      if (!seenTimes.has(d.time)) {
        seenTimes.add(d.time);
        uniqueTimeData.push({
          time: d.time + new Date().getTimezoneOffset() * -60,
          open: d.open, high: d.high, low: d.low, close: d.close,
          volume: d.volume || 0
        });
      }
    });

    // Set candlestick data
    candleSeries.setData(uniqueTimeData);

    // ── Volume Histogram ──
    if (volumeRef.current) {
      if (showVolume) {
        const volumeData = uniqueTimeData.map(d => ({
          time: d.time,
          value: d.volume || 0,
          color: d.close >= d.open ? 'rgba(74, 222, 128, 0.25)' : 'rgba(248, 113, 113, 0.25)',
        }));
        volumeRef.current.setData(volumeData);
      } else {
        volumeRef.current.setData([]);
      }
    }

    // ── SMA Indicators ──
    if (sma20Ref.current) {
      if (showSMA20) {
        sma20Ref.current.setData(calculateSMA(uniqueTimeData, 20));
      } else {
        sma20Ref.current.setData([]);
      }
    }

    if (sma50Ref.current) {
      if (showSMA50) {
        sma50Ref.current.setData(calculateSMA(uniqueTimeData, 50));
      } else {
        sma50Ref.current.setData([]);
      }
    }

    // ── Price Lines ──
    if (!Array.isArray(seriesRef.current.priceLines)) seriesRef.current.priceLines = [];
    seriesRef.current.priceLines.forEach(line => { try { candleSeries.removePriceLine(line); } catch(e) {} });
    seriesRef.current.priceLines = [];

    // Live Price Line
    if (currentAssetPrice) {
      const liveLine = candleSeries.createPriceLine({
        price: currentAssetPrice,
        color: currentAssetPrice >= (uniqueTimeData[0]?.open || 0) ? '#4ade80' : '#f87171',
        lineWidth: 2, lineStyle: 0, axisLabelVisible: true, title: 'LIVE',
      });
      seriesRef.current.priceLines.push(liveLine);
    }

    // Pending Order Lines (TP, SL, Limits)
    pendingOrders.forEach(order => {
      let title = order.order_type === 'Stop Loss' ? 'SL' : order.order_type === 'Take Profit' ? 'TP' : 'LMT';
      title += ` ${order.side.toUpperCase()}`;
      const orderLine = candleSeries.createPriceLine({
        price: Number(order.price),
        color: order.order_type === 'Stop Loss' ? '#f59e0b' : order.order_type === 'Take Profit' ? '#3ec773' : '#3b82f6',
        lineWidth: 1,
        lineStyle: 1,
        axisLabelVisible: true,
        title: title
      });
      seriesRef.current.priceLines.push(orderLine);
    });

    // Restore visible range
    const chartContainer = chartContainerRef.current;
    if (chartContainer && chartContainer.dataset.savedRange) {
      try {
        const savedTimeRange = JSON.parse(chartContainer.dataset.savedRange);
        chart.timeScale().setVisibleTimeRange(savedTimeRange);
        delete chartContainer.dataset.savedRange;
      } catch (e) {
        if (currentRange) chart.timeScale().setVisibleLogicalRange(currentRange);
      }
    } else if (currentRange) {
      chart.timeScale().setVisibleLogicalRange(currentRange);
    }

  }, [chartData, currentAssetPrice, ticker, interval, pendingOrders, showSMA20, showSMA50, showVolume]);

  const handleOrderTypeChange = (e) => {
    const type = e.target.value;
    setOrderType(type);
    if (type === 'Market') setPrice(currentAssetPrice.toFixed(2));
  };

  const setQtyPercent = (pct) => {
    const currentP = parseFloat(price) || currentAssetPrice;
    const maxQty = Math.floor(balance / currentP);
    setQty(Math.floor(maxQty * pct));
  };

  const total = (parseFloat(qty) || 0) * (parseFloat(price) || currentAssetPrice);
  const maxShares = Math.floor(balance / (parseFloat(price) || currentAssetPrice || 1));

  // ── P&L estimations for TP/SL ──
  const entryPrice = parseFloat(price) || currentAssetPrice;
  const numQtyPreview = parseFloat(qty) || 0;
  const tpPnl = tpPrice ? ((parseFloat(tpPrice) - entryPrice) * numQtyPreview * (tradeMode === 'buy' ? 1 : -1)) : 0;
  const slPnl = slPrice ? ((parseFloat(slPrice) - entryPrice) * numQtyPreview * (tradeMode === 'buy' ? 1 : -1)) : 0;
  const tpPnlPct = entryPrice > 0 && tpPrice ? (((parseFloat(tpPrice) - entryPrice) / entryPrice) * 100 * (tradeMode === 'buy' ? 1 : -1)) : 0;
  const slPnlPct = entryPrice > 0 && slPrice ? (((parseFloat(slPrice) - entryPrice) / entryPrice) * 100 * (tradeMode === 'buy' ? 1 : -1)) : 0;

  const executeTrade = async () => {
    if (!user) {
      setTradeMsg({ type: 'error', text: 'Please sign in to trade.' });
      return;
    }
    const numQty = parseFloat(qty) || 0;
    if (numQty <= 0) {
      setTradeMsg({ type: 'error', text: 'Enter a quantity greater than 0.' });
      return;
    }

    // TP/SL validation
    const tp = parseFloat(tpPrice);
    const sl = parseFloat(slPrice);
    if (showTpSl && tp) {
      if (tradeMode === 'buy' && tp <= currentAssetPrice) {
        setTradeMsg({ type: 'error', text: `Take Profit must be above current price (₮${currentAssetPrice.toFixed(2)}).` });
        return;
      }
      if (tradeMode === 'sell' && tp >= currentAssetPrice) {
        setTradeMsg({ type: 'error', text: `Take Profit must be below current price (₮${currentAssetPrice.toFixed(2)}).` });
        return;
      }
    }
    if (showTpSl && sl) {
      if (tradeMode === 'buy' && sl >= currentAssetPrice) {
        setTradeMsg({ type: 'error', text: `Stop Loss must be below current price (₮${currentAssetPrice.toFixed(2)}).` });
        return;
      }
      if (tradeMode === 'sell' && sl <= currentAssetPrice) {
        setTradeMsg({ type: 'error', text: `Stop Loss must be above current price (₮${currentAssetPrice.toFixed(2)}).` });
        return;
      }
    }

    setTradeLoading(true);
    setTradeMsg(null);

    // Execute the main order
    const { data, error } = await supabase.rpc('execute_order', {
      p_user_id: user.id,
      p_asset_id: asset.id,
      p_ticker: ticker,
      p_order_type: orderType,
      p_side: tradeMode,
      p_quantity: numQty,
      p_price: parseFloat(price) || currentAssetPrice
    });

    if (error) {
      setTradeLoading(false);
      setTradeMsg({ type: 'error', text: error.message });
      toast(error.message, 'error');
      return;
    }

    if (data && !data.success) {
      setTradeLoading(false);
      const isNoLiquidity = data.error?.includes('No sellers') || data.error?.includes('No buyers');
      const errMsg = isNoLiquidity
        ? `No liquidity right now. Place a Limit ${tradeMode === 'buy' ? 'Buy' : 'Sell'} order instead and wait for a match.`
        : data.error;
      setTradeMsg({ type: 'error', text: errMsg });
      toast(errMsg, 'error');
      return;
    }

    // Main order succeeded — show result
    const filledQty = data.filled_qty || numQty;
    if (data.status === 'FILLED') {
      toast(`${tradeMode.toUpperCase()} ${numQty} ${ticker} @ ₮${data.avg_price}`, 'success');
    } else if (data.status === 'PARTIAL') {
      toast(`PARTIAL ${data.filled_qty}/${numQty} ${ticker} @ ₮${data.avg_price}`, 'info');
    } else {
      toast(`${orderType} ${tradeMode.toUpperCase()} order placed!`, 'success');
    }

    // ── Auto-create TP/SL orders if set ──
    const tpSlMessages = [];
    const oppositeSide = tradeMode === 'buy' ? 'sell' : 'buy';

    if (showTpSl && tp && (data.status === 'FILLED' || data.status === 'PARTIAL')) {
      const { data: tpData, error: tpErr } = await supabase.rpc('execute_order', {
        p_user_id: user.id,
        p_asset_id: asset.id,
        p_ticker: ticker,
        p_order_type: 'Take Profit',
        p_side: oppositeSide,
        p_quantity: filledQty,
        p_price: tp
      });
      if (!tpErr && tpData?.success) {
        tpSlMessages.push(`TP @ ₮${tp.toFixed(2)}`);
      }
    }

    if (showTpSl && sl && (data.status === 'FILLED' || data.status === 'PARTIAL')) {
      const { data: slData, error: slErr } = await supabase.rpc('execute_order', {
        p_user_id: user.id,
        p_asset_id: asset.id,
        p_ticker: ticker,
        p_order_type: 'Stop Loss',
        p_side: oppositeSide,
        p_quantity: filledQty,
        p_price: sl
      });
      if (!slErr && slData?.success) {
        tpSlMessages.push(`SL @ ₮${sl.toFixed(2)}`);
      }
    }

    // Build final success message
    let mainMsg = data.status === 'FILLED'
      ? `${tradeMode.toUpperCase()} ${numQty} ${ticker} @ ₮${data.avg_price}`
      : data.status === 'PARTIAL'
        ? `PARTIAL ${data.filled_qty}/${numQty} @ ₮${data.avg_price}`
        : `${orderType} ${tradeMode.toUpperCase()} order placed`;

    if (tpSlMessages.length > 0) {
      mainMsg += ` · ${tpSlMessages.join(' / ')}`;
    }

    setTradeMsg({ type: 'success', text: mainMsg });
    setTradeLoading(false);
    setQty('');
    setTpPrice('');
    setSlPrice('');
    setShowTpSl(false);
    fetchPendingOrders(asset.id);
    refreshProfile();
  };

  const cancelOrder = async (orderId) => {
    const { data, error } = await supabase.rpc('cancel_order', { p_user_id: user.id, p_order_id: orderId });
    if (!error && data?.success) {
      toast('Order cancelled', 'success');
      fetchPendingOrders(asset.id);
      refreshProfile();
    } else {
      toast(data?.error || error?.message || 'Failed to cancel', 'error');
    }
  };

  const lastCandle = chartData.length > 0 ? chartData[chartData.length - 1] : { open: 0, high: 0, low: 0, close: 0 };

  if (loading) {
    return <AssetDetailSkeleton />;
  }

  if (!asset) {
    return <div className="text-center py-20 text-[#f87171] font-mono">Asset "{ticker}" not found.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
        {/* IPO Banner */}
        {asset.status === 'IPO' && (
          <div className="w-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] px-4 py-2 rounded-lg mb-6 flex justify-between items-center text-sm">
              <div className="flex items-center">
                  <iconify-icon icon="solar:info-circle-linear" class="mr-2 text-lg"></iconify-icon>
                  <span><strong>IPO Phase Active</strong> · Early subscriptions open.</span>
              </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (Chart & Orderbook) */}
            <div className="lg:col-span-2 flex flex-col space-y-6">
                {/* Chart Area */}
                <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl flex flex-col h-[450px]">
                    <div className="flex justify-between items-center px-4 py-3 border-b border-[#1a1a1a]">
                        <div className="flex items-center space-x-4">
                            {/* Timeframe Selector */}
                            <div className="flex space-x-1">
                                {['1m', '5m', '1h', '1D'].map(int => (
                                  <button
                                    key={int}
                                    onClick={() => setChartInterval(int)}
                                    className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${interval === int ? 'text-[#f0ebe0] bg-[#1a1a1a]' : 'text-[#8a8580] hover:text-[#f0ebe0] hover:bg-[#1a1a1a]'}`}
                                  >
                                    {int}
                                  </button>
                                ))}
                            </div>

                            {/* Indicator Toggles */}
                            <div className="hidden sm:flex items-center space-x-1 border-l border-[#1a1a1a] pl-4">
                                <button
                                  onClick={() => setShowSMA20(v => !v)}
                                  className={`px-2 py-1 text-[10px] font-mono rounded transition-all ${showSMA20 ? 'text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/30' : 'text-[#5a5650] hover:text-[#8a8580]'}`}
                                >
                                  SMA20
                                </button>
                                <button
                                  onClick={() => setShowSMA50(v => !v)}
                                  className={`px-2 py-1 text-[10px] font-mono rounded transition-all ${showSMA50 ? 'text-[#3b82f6] bg-[#3b82f6]/10 border border-[#3b82f6]/30' : 'text-[#5a5650] hover:text-[#8a8580]'}`}
                                >
                                  SMA50
                                </button>
                                <button
                                  onClick={() => setShowVolume(v => !v)}
                                  className={`px-2 py-1 text-[10px] font-mono rounded transition-all ${showVolume ? 'text-[#a78bfa] bg-[#a78bfa]/10 border border-[#a78bfa]/30' : 'text-[#5a5650] hover:text-[#8a8580]'}`}
                                >
                                  VOL
                                </button>
                            </div>
                        </div>

                        <div className="flex space-x-3 text-xs text-[#8a8580] font-mono">
                            <span>O:{(lastCandle?.open || 0).toFixed(2)}</span>
                            <span>H:{(lastCandle?.high || 0).toFixed(2)}</span>
                            <span>L:{(lastCandle?.low || 0).toFixed(2)}</span>
                            <span className={(lastCandle?.close || 0) >= (lastCandle?.open || 0) ? 'text-[#4ade80]' : 'text-[#f87171]'}>C:{(lastCandle?.close || 0).toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="flex-1 relative w-full overflow-hidden" ref={chartContainerRef}>
                        {/* Lightweight chart canvas */}
                        <div className="absolute bottom-8 left-4 pointer-events-none z-10 opacity-[0.07]">
                            <span className="font-serif italic text-4xl text-[#f0ebe0]">TraX</span>
                        </div>
                    </div>
                </div>

                {/* Order Book & Trade History */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Order Book */}
                    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl flex flex-col">
                        <div className="px-4 py-3 border-b border-[#1a1a1a]">
                            <h3 className="text-[11px] font-mono text-[#5a5650] uppercase tracking-widest font-semibold">Order Book</h3>
                        </div>
                        <div className="flex-1 flex flex-col p-2 space-y-1 overflow-y-auto max-h-[350px]">
                            <div className="flex justify-between px-2 py-1 text-[10px] text-[#8a8580] uppercase font-medium">
                                <span>Price</span><span>Qty</span>
                            </div>

                            {/* ASKS */}
                            {asks.length > 0 ? (
                              <div className="flex flex-col-reverse space-y-reverse space-y-[1px]">
                                  {asks.map((o, i) => (
                                    <div key={`sell-${i}`} onClick={() => setPrice(o.p.toFixed(2))} className="flex justify-between px-2 py-1 text-xs font-mono rounded bg-[#f87171]/5 hover:bg-[#f87171]/10 cursor-pointer transition-colors">
                                        <span className="text-[#f87171]">{o.p.toFixed(2)}</span><span className="text-[#f0ebe0]">{o.q.toLocaleString()}</span>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="py-4 text-center text-xs font-mono text-[#5a5650]">No open asks.</div>
                            )}

                            {/* Spread */}
                            <div className="py-2 text-center border-y border-[#1a1a1a] my-1">
                                <span className="font-mono text-sm text-[#f0ebe0]">{currentAssetPrice.toFixed(2)}</span>
                                {(bids.length > 0 && asks.length > 0) && (
                                  <span className="text-[10px] text-[#8a8580] ml-2">Spread: {(asks[0].p - bids[0].p).toFixed(2)}</span>
                                )}
                            </div>

                            {/* BIDS */}
                            {bids.length > 0 ? (
                              <div className="flex flex-col space-y-[1px]">
                                  {bids.map((o, i) => (
                                    <div key={`buy-${i}`} onClick={() => setPrice(o.p.toFixed(2))} className="flex justify-between px-2 py-1 text-xs font-mono rounded bg-[#4ade80]/5 hover:bg-[#4ade80]/10 cursor-pointer transition-colors">
                                        <span className="text-[#4ade80]">{o.p.toFixed(2)}</span><span className="text-[#f0ebe0]">{o.q.toLocaleString()}</span>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="py-4 text-center text-xs font-mono text-[#5a5650]">No open bids.</div>
                            )}
                        </div>
                    </div>

                    {/* Trade History */}
                    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl flex flex-col">
                        <div className="px-4 py-3 border-b border-[#1a1a1a]">
                            <h3 className="text-[11px] font-mono text-[#5a5650] uppercase tracking-widest font-semibold">Recent Trades</h3>
                        </div>
                        <div className="flex-1 flex flex-col p-2 space-y-1 overflow-y-auto max-h-[350px]">
                            <div className="grid grid-cols-3 px-2 py-1 text-[10px] text-[#8a8580] uppercase font-medium">
                                <span className="text-left">Time</span><span className="text-center">Price</span><span className="text-right">Qty</span>
                            </div>
                            {recentTrades.length > 0 ? recentTrades.map((t, i) => {
                                const isUp = i < recentTrades.length - 1 ? Number(t.price) >= Number(recentTrades[i+1].price) : true;
                                return (
                                  <div key={i} className="grid grid-cols-3 px-2 py-1 text-xs font-mono rounded hover:bg-[#1a1a1a] transition-colors">
                                      <span className="text-left text-[#8a8580]">{new Date(t.executed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                      <span className={`text-center ${isUp ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{Number(t.price).toFixed(2)}</span>
                                      <span className="text-right text-[#f0ebe0]">{Number(t.quantity).toLocaleString()}</span>
                                  </div>
                                );
                            }) : (
                              <div className="py-8 text-center text-sm text-[#5a5650]">No trades yet. Be the first!</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column (Trading Panel) */}
            <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-20 self-start">
                <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="font-mono text-2xl text-[#d4af37] leading-none mb-1">{ticker}</h2>
                            <span className="text-xs text-[#8a8580]">{asset.name}</span>
                        </div>
                        <div className="text-right">
                            <div className="font-mono text-2xl text-[#f0ebe0] leading-none mb-1">₮{currentAssetPrice.toFixed(2)}</div>
                            <div className={`font-mono text-sm ${Number(asset.change_24h) >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                              {Number(asset.change_24h) >= 0 ? '+' : ''}{Number(asset.change_24h).toFixed(2)}%
                            </div>
                        </div>
                    </div>

                    {/* Buy/Sell Tabs */}
                    <div className="flex bg-[#0a0a0a] rounded-lg p-1 border border-[#1a1a1a] mb-6">
                        <button onClick={() => setTradeMode('buy')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${tradeMode === 'buy' ? 'bg-[#1a1a1a] text-[#4ade80]' : 'text-[#8a8580] hover:text-[#4ade80]'}`}>Buy</button>
                        <button onClick={() => setTradeMode('sell')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${tradeMode === 'sell' ? 'bg-[#1a1a1a] text-[#f87171]' : 'text-[#8a8580] hover:text-[#f87171]'}`}>Sell</button>
                    </div>

                    {/* Trade Messages */}
                    {tradeMsg && (
                      <div className={`mb-4 p-3 text-xs rounded-lg text-center ${tradeMsg.type === 'error' ? 'bg-red-900/20 border border-red-900/50 text-[#f87171]' : 'bg-green-900/20 border border-green-900/50 text-[#4ade80]'}`}>
                        {tradeMsg.text}
                      </div>
                    )}

                    <div className="space-y-4">
                        {/* Order Type */}
                        <div>
                            <label className="block text-xs text-[#8a8580] mb-1.5">Order Type</label>
                            <div className="relative">
                                <button
                                    onClick={(e) => { e.preventDefault(); setIsOrderTypeMenuOpen(!isOrderTypeMenuOpen); }}
                                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#f0ebe0] text-sm rounded-lg px-3 py-2.5 flex justify-between items-center focus:outline-none focus:border-[#d4af37] transition-colors"
                                >
                                    <span>{orderType}</span>
                                    <iconify-icon icon="solar:alt-arrow-down-linear" class={`text-[#8a8580] transition-transform ${isOrderTypeMenuOpen ? 'rotate-180' : ''}`}></iconify-icon>
                                </button>

                                {isOrderTypeMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsOrderTypeMenuOpen(false)}></div>
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in origin-top">
                                            {['Market', 'Limit'].map(type => (
                                                <button
                                                    key={type}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setOrderType(type);
                                                        setIsOrderTypeMenuOpen(false);
                                                        if (type === 'Market' && asset) setPrice(Number(asset.current_price).toFixed(2));
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${orderType === type ? 'bg-[#d4af37]/10 text-[#d4af37]' : 'text-[#8a8580] hover:bg-[#1a1a1a] hover:text-[#f0ebe0]'}`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            <p className="text-[10px] text-[#5a5650] mt-1.5">
                              {orderType === 'Market' ? 'Executes instantly at best available price.'
                                : 'Sets your price. Order waits on the book for a match.'}
                            </p>
                        </div>

                        {/* Quantity */}
                        <div>
                            <div className="flex justify-between mb-1.5">
                                <label className="block text-xs text-[#8a8580]">Quantity</label>
                                <span className="text-xs text-[#5a5650] font-mono">Max: {maxShares}</span>
                            </div>
                            <div className="relative">
                                <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#f0ebe0] font-mono text-lg rounded-lg pl-3 pr-16 py-2 focus:outline-none focus:border-[#d4af37]" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a8580]">Shares</span>
                            </div>
                            <div className="flex space-x-2 mt-2">
                                {[{label: '25%', v: 0.25}, {label: '50%', v: 0.50}, {label: '75%', v: 0.75}, {label: 'Max', v: 1.00}].map(btn => (
                                  <button key={btn.label} onClick={() => setQtyPercent(btn.v)} className="flex-1 py-1 text-[10px] border border-[#1a1a1a] rounded text-[#8a8580] hover:border-[#2a2a2a] hover:text-[#f0ebe0] transition-colors">{btn.label}</button>
                                ))}
                            </div>
                        </div>

                        {/* Price */}
                        <div className={`${orderType === 'Market' ? 'opacity-50' : ''}`}>
                            <label className="block text-xs text-[#8a8580] mb-1.5">Price (₮)</label>
                            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} disabled={orderType === 'Market'} className={`w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#f0ebe0] font-mono text-lg rounded-lg px-3 py-2 ${orderType === 'Market' ? 'cursor-not-allowed' : 'focus:outline-none focus:border-[#d4af37]'}`} />
                        </div>

                        {/* ── TP / SL Section (TradingView-style) ── */}
                        <div className="border-t border-[#1a1a1a] pt-3">
                            <button
                              onClick={() => {
                                setShowTpSl(!showTpSl);
                                if (!showTpSl) {
                                  // Pre-fill with sensible defaults
                                  const base = parseFloat(price) || currentAssetPrice;
                                  if (tradeMode === 'buy') {
                                    setTpPrice((base * 1.05).toFixed(2));
                                    setSlPrice((base * 0.95).toFixed(2));
                                  } else {
                                    setTpPrice((base * 0.95).toFixed(2));
                                    setSlPrice((base * 1.05).toFixed(2));
                                  }
                                }
                              }}
                              className="w-full flex items-center justify-between text-xs py-1 group"
                            >
                              <div className="flex items-center space-x-2">
                                <div className={`w-8 h-[18px] rounded-full transition-colors relative ${showTpSl ? 'bg-[#d4af37]' : 'bg-[#2a2a2a]'}`}>
                                  <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all ${showTpSl ? 'left-[16px]' : 'left-[2px]'}`}></div>
                                </div>
                                <span className={`font-medium ${showTpSl ? 'text-[#f0ebe0]' : 'text-[#8a8580]'}`}>TP / SL</span>
                              </div>
                              <span className="text-[10px] text-[#5a5650]">Take Profit & Stop Loss</span>
                            </button>

                            {showTpSl && (
                              <div className="mt-3 space-y-3 animate-fade-in">
                                {/* Take Profit */}
                                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center space-x-1.5">
                                      <div className="w-2 h-2 rounded-full bg-[#4ade80]"></div>
                                      <label className="text-xs font-medium text-[#4ade80]">Take Profit</label>
                                    </div>
                                    {tpPrice && numQtyPreview > 0 && (
                                      <div className="flex items-center space-x-2">
                                        <span className={`font-mono text-[10px] ${tpPnl >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                                          {tpPnl >= 0 ? '+' : ''}₮{tpPnl.toFixed(2)}
                                        </span>
                                        <span className={`font-mono text-[10px] px-1 py-0.5 rounded ${tpPnlPct >= 0 ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#f87171]/10 text-[#f87171]'}`}>
                                          {tpPnlPct >= 0 ? '+' : ''}{tpPnlPct.toFixed(1)}%
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#5a5650]">₮</span>
                                    <input
                                      type="number"
                                      value={tpPrice}
                                      onChange={(e) => setTpPrice(e.target.value)}
                                      placeholder={tradeMode === 'buy' ? 'Above entry' : 'Below entry'}
                                      className="w-full bg-[#0f0f0f] border border-[#1a1a1a] text-[#f0ebe0] font-mono rounded-md pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:border-[#4ade80]/50"
                                    />
                                  </div>
                                  <p className="text-[9px] text-[#5a5650] mt-1">
                                    {tradeMode === 'buy' ? 'Auto-sells when price rises to this target' : 'Auto-buys when price drops to this target'}
                                  </p>
                                </div>

                                {/* Stop Loss */}
                                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center space-x-1.5">
                                      <div className="w-2 h-2 rounded-full bg-[#f87171]"></div>
                                      <label className="text-xs font-medium text-[#f87171]">Stop Loss</label>
                                    </div>
                                    {slPrice && numQtyPreview > 0 && (
                                      <div className="flex items-center space-x-2">
                                        <span className={`font-mono text-[10px] ${slPnl >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                                          {slPnl >= 0 ? '+' : ''}₮{slPnl.toFixed(2)}
                                        </span>
                                        <span className={`font-mono text-[10px] px-1 py-0.5 rounded ${slPnlPct >= 0 ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#f87171]/10 text-[#f87171]'}`}>
                                          {slPnlPct >= 0 ? '+' : ''}{slPnlPct.toFixed(1)}%
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#5a5650]">₮</span>
                                    <input
                                      type="number"
                                      value={slPrice}
                                      onChange={(e) => setSlPrice(e.target.value)}
                                      placeholder={tradeMode === 'buy' ? 'Below entry' : 'Above entry'}
                                      className="w-full bg-[#0f0f0f] border border-[#1a1a1a] text-[#f0ebe0] font-mono rounded-md pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:border-[#f87171]/50"
                                    />
                                  </div>
                                  <p className="text-[9px] text-[#5a5650] mt-1">
                                    {tradeMode === 'buy' ? 'Auto-sells when price drops to limit loss' : 'Auto-buys when price rises to limit loss'}
                                  </p>
                                </div>

                                {/* Risk:Reward Ratio */}
                                {tpPrice && slPrice && numQtyPreview > 0 && Math.abs(slPnl) > 0 && (
                                  <div className="flex items-center justify-between text-[10px] text-[#8a8580] px-1">
                                    <span>Risk : Reward</span>
                                    <span className="font-mono text-[#d4af37]">
                                      1 : {Math.abs(tpPnl / slPnl).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                        </div>

                        {/* Estimated Total */}
                        <div className="flex justify-between items-center py-3 border-t border-[#1a1a1a] mt-2">
                            <span className="text-sm text-[#8a8580]">Estimated Total</span>
                            <span className="font-mono text-lg text-[#f0ebe0]">₮{total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>

                        {/* Execute Button */}
                        <button onClick={executeTrade} disabled={tradeLoading} className={`w-full text-[#0a0a0a] font-medium py-3 rounded-lg active:scale-[0.98] transition-all disabled:opacity-50 ${tradeMode === 'buy' ? 'bg-[#4ade80] hover:bg-[#3ec773]' : 'bg-[#f87171] hover:bg-[#e05e5e]'}`}>
                            {tradeLoading ? 'Processing...' : `${tradeMode === 'buy' ? 'Buy' : 'Sell'} ${ticker}${showTpSl && (tpPrice || slPrice) ? ' + TP/SL' : ''}`}
                        </button>

                        <div className="text-center">
                            <span className="text-xs text-[#8a8580]">Available Balance: <span className="font-mono text-[#f0ebe0]">₮{Number(balance).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></span>
                        </div>
                    </div>
                </div>

                {/* Pending Orders */}
                {pendingOrders.length > 0 && (
                  <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4">
                    <h3 className="text-[11px] font-mono text-[#5a5650] uppercase tracking-widest font-semibold border-b border-[#1a1a1a] pb-3 mb-3">Active Orders</h3>
                    <div className="space-y-2">
                      {pendingOrders.map(order => (
                        <div key={order.id} className="flex items-center justify-between text-xs font-mono p-2 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
                          <div className="flex flex-col">
                            <span className={`font-medium ${order.side === 'buy' ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                              {order.order_type} {order.side.toUpperCase()}
                            </span>
                            <span className="text-[#8a8580]">{Number(order.quantity)} @ ₮{Number(order.price).toFixed(2)}</span>
                          </div>
                          <button
                            onClick={() => cancelOrder(order.id)}
                            className="text-[#f87171] hover:text-red-400 hover:bg-red-900/20 px-2 py-1 rounded transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Asset Info Card */}
                <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4">
                    <h3 className="text-[11px] font-mono text-[#5a5650] uppercase tracking-widest font-semibold border-b border-[#1a1a1a] pb-3 mb-4">Asset Information</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[#8a8580]">Market Cap</span>
                            <span className="font-mono text-[#d4af37]">₮{(Number(asset.current_price) * Number(asset.total_supply)).toLocaleString('en-US', {maximumFractionDigits: 0})}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#8a8580]">Total Supply</span>
                            <span className="font-mono text-[#f0ebe0]">{Number(asset.total_supply).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#8a8580]">24h Volume</span>
                            <span className="font-mono text-[#f0ebe0]">{Number(asset.volume_24h).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#8a8580]">IPO Price</span>
                            <span className="font-mono text-[#f0ebe0]">₮{Number(asset.ipo_price).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#8a8580]">24h High</span>
                            <span className="font-mono text-[#f0ebe0]">₮{Number(asset.high_24h).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#8a8580]">24h Low</span>
                            <span className="font-mono text-[#f0ebe0]">₮{Number(asset.low_24h).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#8a8580]">Date Listed</span>
                            <span className="font-mono text-[#f0ebe0]">{new Date(asset.listed_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* Top Holders */}
                {topHolders.length > 0 && (
                  <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4">
                    <h3 className="text-[11px] font-mono text-[#5a5650] uppercase tracking-widest font-semibold border-b border-[#1a1a1a] pb-3 mb-4">Top Holders</h3>
                    <div className="space-y-3">
                      {topHolders.map((holder, i) => {
                        const ownershipPct = ((Number(holder.quantity) / Number(asset.total_supply)) * 100);
                        return (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${i === 0 ? 'bg-[#d4af37]/20 text-[#d4af37]' : i === 1 ? 'bg-[#c0c0c0]/20 text-[#c0c0c0]' : 'bg-[#cd7f32]/20 text-[#cd7f32]'}`}>
                                {i + 1}
                              </div>
                              <span className="text-[#f0ebe0] font-mono text-xs">{holder.profiles?.username || 'Anonymous'}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[#d4af37] font-mono text-xs">{ownershipPct.toFixed(2)}%</span>
                              <span className="text-[#5a5650] font-mono text-[10px] ml-2">{Number(holder.quantity).toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
        </div>
    </div>
  );
}
