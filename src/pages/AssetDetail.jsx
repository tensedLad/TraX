import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AssetDetailSkeleton } from '../components/Skeleton';
import { createChart, CandlestickSeries } from 'lightweight-charts';

// Helper to aggregate 1m granular price data into higher timeframes (5m, 1h, 1D)
const aggregateCandles = (data, targetInterval) => {
  if (targetInterval === '1m' || !data.length) return data;
  
  const stepMinutes = targetInterval === '5m' ? 5 : targetInterval === '1h' ? 60 : 1440;
  const stepSeconds = stepMinutes * 60;
  
  const aggregated = [];
  let currentGroup = null;
  
  data.forEach(candle => {
    // Floor the time to the nearest interval step
    const groupTime = Math.floor(candle.time / stepSeconds) * stepSeconds;
    
    if (!currentGroup || currentGroup.time !== groupTime) {
      if (currentGroup) aggregated.push(currentGroup);
      currentGroup = {
        time: groupTime,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close
      };
    } else {
      currentGroup.high = Math.max(currentGroup.high, candle.high);
      currentGroup.low = Math.min(currentGroup.low, candle.low);
      currentGroup.close = candle.close;
    }
  });
  if (currentGroup) aggregated.push(currentGroup);
  return aggregated;
};

export default function AssetDetail() {
  const { id } = useParams();
  const ticker = id || 'BANANA';
  const chartContainerRef = useRef(null);
  const { user, profile, refreshProfile } = useAuth();
  
  const [interval, setChartInterval] = useState('5m');
  const [tradeMode, setTradeMode] = useState('buy');
  const [orderType, setOrderType] = useState('Market');
  const [isOrderTypeMenuOpen, setIsOrderTypeMenuOpen] = useState(false);
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [chartData, setChartData] = useState([]);
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeMsg, setTradeMsg] = useState(null);
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);

  const balance = profile?.balance ?? 10000;
  const currentAssetPrice = asset ? Number(asset.current_price) : 0;

  // Fetch asset info
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

    // Realtime asset price updates
    const channel = supabase
      .channel(`asset-${ticker}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets', filter: `ticker=eq.${ticker}` }, (payload) => {
        setAsset(payload.new);
        if (orderType === 'Market') {
          setPrice(Number(payload.new.current_price).toFixed(2));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ticker]);

  // Fetch chart data from price_history
  useEffect(() => {
    if (!asset) return;

    const fetchChart = async () => {
      // Fetch ALL available price history for this asset (both seeded 5m and trade-generated 1m)
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('asset_id', asset.id)
        .order('timestamp', { ascending: true })
        .limit(1000);

      let rawData = [];
      if (!error && data && data.length > 0) {
        // Convert all data to uniform format with unix timestamps
        rawData = data.map(d => ({
          time: Math.floor(new Date(d.timestamp).getTime() / 1000),
          open: Number(d.open), high: Number(d.high), low: Number(d.low), close: Number(d.close)
        }));

        // Sort by time and deduplicate — if multiple entries share the same second, merge them
        rawData.sort((a, b) => a.time - b.time);
        const deduped = [];
        rawData.forEach(d => {
          if (deduped.length > 0 && deduped[deduped.length - 1].time === d.time) {
            // Merge: keep earlier open, stretch high/low, use later close
            const prev = deduped[deduped.length - 1];
            prev.high = Math.max(prev.high, d.high);
            prev.low = Math.min(prev.low, d.low);
            prev.close = d.close;
          } else {
            deduped.push({ ...d });
          }
        });
        rawData = deduped;
      }
      
      // Aggregate into whichever interval the user selected
      const aggregated = aggregateCandles(rawData, interval);
      setChartData(padChartData(aggregated, interval === '1m' ? 60 : interval === '5m' ? 40 : interval === '1h' ? 24 : 30, interval));
    };
    fetchChart();
  }, [asset, interval]);

  // Fetch Recent Trades + Realtime subscription for trades & chart refresh
  useEffect(() => {
    if (!asset) return;

    const fetchRecentTrades = async () => {
      const { data } = await supabase
        .from('trades')
        .select('price, quantity, side, executed_at')
        .eq('ticker', ticker)
        .order('executed_at', { ascending: false })
        .limit(20);
      if (data) setRecentTrades(data);
    };
    fetchRecentTrades();

    // Live subscription: when ANY new trade for this asset comes in, refresh trades + chart
    const tradeSub = supabase.channel(`trades-${ticker}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trades', filter: `ticker=eq.${ticker}` }, () => {
        fetchRecentTrades();
        // Also re-fetch chart data so new candle appears
        const refetchChart = async () => {
          const { data } = await supabase
            .from('price_history')
            .select('*')
            .eq('asset_id', asset.id)
            .order('timestamp', { ascending: true })
            .limit(1000);
          let rawData = [];
          if (data && data.length > 0) {
            rawData = data.map(d => ({
              time: Math.floor(new Date(d.timestamp).getTime() / 1000),
              open: Number(d.open), high: Number(d.high), low: Number(d.low), close: Number(d.close)
            }));
            // Sort and deduplicate
            rawData.sort((a, b) => a.time - b.time);
            const deduped = [];
            rawData.forEach(d => {
              if (deduped.length > 0 && deduped[deduped.length - 1].time === d.time) {
                const prev = deduped[deduped.length - 1];
                prev.high = Math.max(prev.high, d.high);
                prev.low = Math.min(prev.low, d.low);
                prev.close = d.close;
              } else {
                deduped.push({ ...d });
              }
            });
            rawData = deduped;
          }
          const aggregated = aggregateCandles(rawData, interval);
          setChartData(padChartData(aggregated, interval === '1m' ? 60 : interval === '5m' ? 40 : interval === '1h' ? 24 : 30, interval));
        };
        refetchChart();
      })
      .subscribe();

    const fetchOrderBook = async () => {
      const { data, error } = await supabase.rpc('get_order_book', { p_asset_id: asset.id });
      if (!error && data) {
        setAsks(data.asks || []);
        setBids(data.bids || []);
      }
    };
    fetchOrderBook();

    const orderSub = supabase.channel(`orders-${ticker}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `ticker=eq.${ticker}` }, () => {
        fetchOrderBook();
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(tradeSub); 
      supabase.removeChannel(orderSub); 
    };
  }, [asset, ticker, interval]);

  // Generate mock candle data (fallback)
  // Pad chart data with flatlines if there's very little history
  const padChartData = (historicalData, targetCount, intervalScale) => {
    if (historicalData.length >= targetCount) return historicalData;
    
    const padded = [];
    const step = intervalScale === '1m' ? 60 : intervalScale === '5m' ? 300 : intervalScale === '1h' ? 3600 : 86400;
    
    // Determine the baseline price to pad with
    const padPrice = historicalData.length > 0 
        ? historicalData[0].open 
        : (currentAssetPrice || Number(asset?.ipo_price) || 10);
    
    // Determine the starting time for padding
    const latestTime = historicalData.length > 0 
        ? historicalData[0].time 
        : Math.floor(Date.now() / 1000);
        
    const needed = targetCount - historicalData.length;
    
    for (let i = needed; i > 0; i--) {
      padded.push({
        time: latestTime - (i * step),
        open: padPrice,
        high: padPrice,
        low: padPrice,
        close: padPrice
      });
    }
    
    return [...padded, ...historicalData];
  };

  // Draw Chart (TradingView Aesthetic)
  useEffect(() => {
    const chartContainer = chartContainerRef.current;
    if (!chartContainer || chartData.length === 0) return;

    // Clear previous charts
    chartContainer.innerHTML = '';

    // Hide TradingView watermark via CSS
    const style = document.createElement('style');
    style.textContent = `
      .tv-lightweight-charts a[href*="tradingview"],
      .tv-lightweight-charts div[style*="tradingview"],
      a[target="_blank"][href*="tradingview"] {
        display: none !important;
      }
    `;
    chartContainer.appendChild(style);

    const chart = createChart(chartContainer, {
      layout: {
        background: { color: '#0f0f0f' },
        textColor: '#8a8580',
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: '#1a1a1a', style: 1 }, // dotted
        horzLines: { color: '#1a1a1a', style: 1 }, // dotted
      },
      crosshair: {
        mode: 1, // Magnet mode
        vertLine: { width: 1, color: '#3d3a34', style: 0, labelBackgroundColor: '#d4af37' },
        horzLine: { width: 1, color: '#3d3a34', style: 0, labelBackgroundColor: '#d4af37' },
      },
      timeScale: {
        borderColor: '#1a1a1a',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1a1a1a',
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#4ade80',
      downColor: '#f87171',
      borderVisible: false,
      wickUpColor: '#4ade80',
      wickDownColor: '#f87171',
    });

    // Make sure data is sorted by time and unique (Lightweight Charts requirement)
    const uniqueTimeData = [];
    const seenTimes = new Set();
    chartData.forEach(d => {
       if(!seenTimes.has(d.time)) {
          seenTimes.add(d.time);
          uniqueTimeData.push(d);
       }
    });

    candleSeries.setData(uniqueTimeData);
    
    // Create Live Price Line Tracker
    if (currentAssetPrice) {
        candleSeries.createPriceLine({
            price: currentAssetPrice,
            color: currentAssetPrice >= (uniqueTimeData[0]?.open || 0) ? '#4ade80' : '#f87171',
            lineWidth: 2,
            lineStyle: 1, // Dotted
            axisLabelVisible: true,
            title: 'LIVE',
        });
    }

    // Restore saved visible range from sessionStorage
    const storageKey = `trax-chart-range-${ticker}-${interval}`;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const range = JSON.parse(saved);
        chart.timeScale().setVisibleRange(range);
      }
    } catch (e) { /* ignore parse errors */ }

    // Save visible range on every zoom/scroll change
    chart.timeScale().subscribeVisibleTimeRangeChange((newRange) => {
      if (newRange) {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(newRange));
        } catch (e) { /* ignore quota errors */ }
      }
    });

    const handleResize = () => {
      if (chartContainer) {
        chart.applyOptions({ width: chartContainer.clientWidth, height: chartContainer.clientHeight });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [chartData, currentAssetPrice]);

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

    setTradeLoading(true);
    setTradeMsg(null);

    const { data, error } = await supabase.rpc('execute_order', {
      p_user_id: user.id,
      p_asset_id: asset.id,
      p_ticker: ticker,
      p_order_type: orderType,
      p_side: tradeMode,
      p_quantity: numQty,
      p_price: parseFloat(price) || currentAssetPrice
    });

    setTradeLoading(false);

    if (error) {
      setTradeMsg({ type: 'error', text: error.message });
    } else if (data && !data.success) {
      setTradeMsg({ type: 'error', text: data.error });
    } else {
      if (data.status === 'FILLED') {
        setTradeMsg({ type: 'success', text: `${orderType.toUpperCase()} order FILLED! ${numQty} ${ticker} @ ~₮${data.avg_price}` });
      } else if (data.status === 'PARTIAL') {
        setTradeMsg({ type: 'success', text: `PARTIAL FILL! ${data.filled_qty} ${ticker} @ ~₮${data.avg_price}. Remaining: ${data.remaining_qty}` });
      } else {
        setTradeMsg({ type: 'success', text: `${orderType.toUpperCase()} order placed! Added to order book.` });
      }
      setQty('');
      refreshProfile();
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
                <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl flex flex-col h-[400px]">
                    <div className="flex justify-between items-center px-4 py-3 border-b border-[#1a1a1a]">
                        <div className="flex space-x-2">
                            {['1m', '5m', '1h', '1D'].map(int => (
                              <button 
                                key={int}
                                onClick={() => setChartInterval(int)} 
                                className={`px-2 py-1 text-xs font-mono rounded transition-colors ${interval === int ? 'text-[#f0ebe0] bg-[#1a1a1a]' : 'text-[#8a8580] hover:text-[#f0ebe0] hover:bg-[#1a1a1a]'}`}
                              >
                                {int}
                              </button>
                            ))}
                        </div>
                        <div className="flex space-x-3 text-xs text-[#8a8580] font-mono">
                            <span>O:{(lastCandle?.open || 0).toFixed(2)}</span> 
                            <span>H:{(lastCandle?.high || 0).toFixed(2)}</span> 
                            <span>L:{(lastCandle?.low || 0).toFixed(2)}</span> 
                            <span className={(lastCandle?.close || 0) >= (lastCandle?.open || 0) ? 'text-[#4ade80]' : 'text-[#f87171]'}>C:{(lastCandle?.close || 0).toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="flex-1 relative w-full overflow-hidden" ref={chartContainerRef}>
                        {/* Lightweight chart injects canvas here */}
                        {/* Custom TraX Watermark */}
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
                        <div className="flex-1 flex flex-col p-2 space-y-1 overflow-y-auto max-h-[300px]">
                            <div className="flex justify-between px-2 py-1 text-[10px] text-[#8a8580] uppercase font-medium">
                                <span>Price</span><span>Qty</span>
                            </div>
                            
                            {/* ASKS (Sales) */}
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

                            {/* Spread / Current Price */}
                            <div className="py-2 text-center border-y border-[#1a1a1a] my-1">
                                <span className="font-mono text-sm text-[#f0ebe0]">{currentAssetPrice.toFixed(2)}</span>
                                {(bids.length > 0 && asks.length > 0) && (
                                  <span className="text-[10px] text-[#8a8580] ml-2">Spread: {(asks[0].p - bids[0].p).toFixed(2)}</span>
                                )}
                            </div>

                            {/* BIDS (Buys) */}
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
                        <div className="flex-1 flex flex-col p-2 space-y-1 overflow-y-auto max-h-[300px]">
                            <div className="grid grid-cols-3 px-2 py-1 text-[10px] text-[#8a8580] uppercase font-medium">
                                <span className="text-left">Time</span><span className="text-center">Price</span><span className="text-right">Qty</span>
                            </div>
                            {recentTrades.length > 0 ? recentTrades.map((t, i) => (
                              <div key={i} className="grid grid-cols-3 px-2 py-1 text-xs font-mono rounded hover:bg-[#1a1a1a] transition-colors">
                                  <span className="text-left text-[#8a8580]">{new Date(t.executed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                  <span className={`text-center ${t.side === 'buy' ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{Number(t.price).toFixed(2)}</span>
                                  <span className="text-right text-[#f0ebe0]">{Number(t.quantity).toLocaleString()}</span>
                              </div>
                            )) : (
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
                                            {['Market', 'Limit', 'Stop Loss'].map(type => (
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
                        </div>

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

                        <div className={`${orderType === 'Market' ? 'opacity-50' : ''}`}>
                            <label className="block text-xs text-[#8a8580] mb-1.5">Price (₮)</label>
                            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} disabled={orderType === 'Market'} className={`w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#f0ebe0] font-mono text-lg rounded-lg px-3 py-2 ${orderType === 'Market' ? 'cursor-not-allowed' : 'focus:outline-none focus:border-[#d4af37]'}`} />
                        </div>

                        <div className="flex justify-between items-center py-3 border-t border-[#1a1a1a] mt-2">
                            <span className="text-sm text-[#8a8580]">Estimated Total</span>
                            <span className="font-mono text-lg text-[#f0ebe0]">₮{total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>

                        <button onClick={executeTrade} disabled={tradeLoading} className={`w-full text-[#0a0a0a] font-medium py-3 rounded-lg active:scale-[0.98] transition-all disabled:opacity-50 ${tradeMode === 'buy' ? 'bg-[#4ade80] hover:bg-[#3ec773]' : 'bg-[#f87171] hover:bg-[#e05e5e]'}`}>
                            {tradeLoading ? 'Processing...' : `Execute ${tradeMode === 'buy' ? 'Buy' : 'Sell'}`}
                        </button>

                        <div className="text-center">
                            <span className="text-xs text-[#8a8580]">Available Balance: <span className="font-mono text-[#f0ebe0]">₮{Number(balance).toLocaleString('en-US', {minimumFractionDigits: 2})}</span></span>
                        </div>
                    </div>
                </div>

                {/* Asset Info Card */}
                <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4">
                    <h3 className="text-[11px] font-mono text-[#5a5650] uppercase tracking-widest font-semibold border-b border-[#1a1a1a] pb-3 mb-4">Asset Information</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[#8a8580]">Total Supply</span>
                            <span className="font-mono text-[#f0ebe0]">{Number(asset.total_supply).toLocaleString()}</span>
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
            </div>
        </div>
    </div>
  );
}
