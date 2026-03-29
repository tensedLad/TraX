import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY. Set them in .env.local");
  process.exit(1);
}

// ── Tuning Knobs ──────────────────────────────────────────────
const NUM_BOTS = parseInt(process.env.NUM_BOTS || '5', 10);
const TICK_INTERVAL_MS = parseInt(process.env.TICK_INTERVAL_MS || '10000', 10);
const CANDLE_FLUSH_MS = parseInt(process.env.CANDLE_FLUSH_MS || '60000', 10);
const CLEANUP_INTERVAL_MS = parseInt(process.env.CLEANUP_INTERVAL_MS || '3600000', 10);
const DATA_RETENTION_HOURS = parseInt(process.env.DATA_RETENTION_HOURS || '24', 10);
// ──────────────────────────────────────────────────────────────

const bots = [];
const masterClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let activeAssets = []; // { id, ticker, price, trendIndex, momentum }

// ── In-memory candle accumulators (flushed to DB every CANDLE_FLUSH_MS) ──
const candleAccumulators = {};

// ── Broadcast channel for streaming live ticks to all clients ──
let broadcastChannel = null;

function randRange(min, max) { return Math.random() * (max - min) + min; }
function getRandomBot() { return bots[Math.floor(Math.random() * bots.length)]; }

async function setupBot(client, email, password, username) {
  await client.auth.signUp({ email, password, options: { data: { username } } });
  const { data: authData, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    console.error(`Error logging in ${email}:`, error.message);
    return null;
  }
  return authData.user;
}

async function giveHoldingsAndMoney(client, userId) {
  await client.from('profiles').update({ balance: 500000000 }).eq('id', userId);
  for (const asset of activeAssets) {
    await client.from('holdings').upsert(
      { user_id: userId, asset_id: asset.id, ticker: asset.ticker, quantity: 10000000, avg_buy_price: asset.price },
      { onConflict: 'user_id, asset_id' }
    );
  }
}

// ── Flush accumulated candles to the DB ──
async function flushCandles() {
  const now = new Date();
  const minuteTs = new Date(Math.floor(now.getTime() / 60000) * 60000).toISOString();

  for (const asset of activeAssets) {
    const acc = candleAccumulators[asset.id];
    if (!acc || acc.tickCount === 0) continue;

    // Upsert the 1m candle into price_history
    const { error } = await masterClient
      .from('price_history')
      .upsert({
        asset_id: asset.id,
        ticker: asset.ticker,
        open: Math.round(acc.open * 100) / 100,
        high: Math.round(acc.high * 100) / 100,
        low: Math.round(acc.low * 100) / 100,
        close: Math.round(acc.close * 100) / 100,
        volume: acc.volume,
        interval: '1m',
        timestamp: acc.minuteTs
      }, { onConflict: 'asset_id,interval,timestamp', ignoreDuplicates: false });

    if (error) {
      // Fallback: just insert (the unique constraint may not exist yet)
      await masterClient.from('price_history').insert({
        asset_id: asset.id,
        ticker: asset.ticker,
        open: Math.round(acc.open * 100) / 100,
        high: Math.round(acc.high * 100) / 100,
        low: Math.round(acc.low * 100) / 100,
        close: Math.round(acc.close * 100) / 100,
        volume: acc.volume,
        interval: '1m',
        timestamp: acc.minuteTs
      });
    }

    // Also update the assets table with current price so the DB is in sync
    await masterClient.from('assets').update({
      current_price: Math.round(asset.price * 100) / 100,
      updated_at: now.toISOString()
    }).eq('id', asset.id);

    // Reset accumulator for next minute
    candleAccumulators[asset.id] = {
      open: asset.price,
      high: asset.price,
      low: asset.price,
      close: asset.price,
      volume: 0,
      tickCount: 0,
      minuteTs: minuteTs
    };
  }
  console.log(`[FLUSH] Candles persisted to DB at ${now.toLocaleTimeString()}`);
}

// ── Data retention: delete old trades and price_history ──
async function cleanupOldData() {
  const cutoff = new Date(Date.now() - DATA_RETENTION_HOURS * 3600 * 1000).toISOString();
  console.log(`[CLEANUP] Deleting data older than ${cutoff}...`);

  const { error: tradeErr, count: tradeCount } = await masterClient
    .from('trades')
    .delete({ count: 'exact' })
    .lt('executed_at', cutoff);
  if (tradeErr) console.error('[CLEANUP] trades error:', tradeErr.message);
  else console.log(`[CLEANUP] Deleted ${tradeCount ?? '?'} old trades`);

  const { error: phErr, count: phCount } = await masterClient
    .from('price_history')
    .delete({ count: 'exact' })
    .lt('timestamp', cutoff);
  if (phErr) console.error('[CLEANUP] price_history error:', phErr.message);
  else console.log(`[CLEANUP] Deleted ${phCount ?? '?'} old price_history rows`);

  const { error: orderErr } = await masterClient
    .from('orders')
    .delete()
    .in('status', ['FILLED', 'CANCELLED'])
    .lt('created_at', cutoff);
  if (orderErr) console.error('[CLEANUP] orders error:', orderErr.message);
}

// ── MAIN BOOT ──
async function bootMarketSimulation() {
  console.log(`Setting up Market Makers (${NUM_BOTS} bots)...`);
  console.log(`Config: TICK=${TICK_INTERVAL_MS}ms, FLUSH=${CANDLE_FLUSH_MS}ms, RETENTION=${DATA_RETENTION_HOURS}h`);

  // 1. Fetch all active assets
  const { data: assetData } = await masterClient
    .from('assets')
    .select('id, ticker, current_price')
    .eq('status', 'ACTIVE');

  if (!assetData || assetData.length === 0) {
    return console.error("No active assets found!");
  }

  activeAssets = assetData.map(a => ({
    id: a.id,
    ticker: a.ticker,
    price: Number(a.current_price) || 10.00,
    trendIndex: 0,
    momentum: 0.1
  }));

  // Initialize candle accumulators
  const nowMinute = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
  for (const asset of activeAssets) {
    candleAccumulators[asset.id] = {
      open: asset.price,
      high: asset.price,
      low: asset.price,
      close: asset.price,
      volume: 0,
      tickCount: 0,
      minuteTs: nowMinute
    };
  }

  // 2. Create the broadcast channel for streaming ticks
  broadcastChannel = masterClient.channel('trax-price-stream');
  broadcastChannel.subscribe((status) => {
    console.log(`Broadcast channel status: ${status}`);
  });

  // 3. Initialize bots
  for (let i = 1; i <= NUM_BOTS; i++) {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const user = await setupBot(client, `mm_bot_${i}@trax.com`, 'traxmmbot123', `Market_Maker_${i}`);
    if (user) {
      await giveHoldingsAndMoney(client, user.id);
      bots.push({ client, user, name: `MM-${i}` });
      process.stdout.write(`*`);
    }
  }

  console.log(`\nReady! ${bots.length} Market Makers across ${activeAssets.length} assets.`);

  // ── 4. Price Simulation Loop (BROADCAST only, no DB writes) ──
  setInterval(async () => {
    const asset = activeAssets[Math.floor(Math.random() * activeAssets.length)];

    // Shift trend occasionally
    if (Math.random() > 0.8) {
      asset.trendIndex = Math.random() > 0.5 ? 1 : -1;
      asset.momentum = randRange(0.01, 0.10);
    } else if (Math.random() > 0.9) {
      asset.trendIndex = 0;
    }

    const noise = randRange(-0.02, 0.02);
    const move = (asset.trendIndex * asset.momentum) + noise;
    asset.price = Math.max(0.01, asset.price + move);

    const fairPrice = Math.round(asset.price * 100) / 100;

    // Update in-memory candle accumulator (NO DB write)
    const currentMinuteTs = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
    const acc = candleAccumulators[asset.id];

    if (acc.minuteTs !== currentMinuteTs) {
      candleAccumulators[asset.id] = {
        open: fairPrice,
        high: fairPrice,
        low: fairPrice,
        close: fairPrice,
        volume: 0,
        tickCount: 1,
        minuteTs: currentMinuteTs
      };
    } else {
      acc.high = Math.max(acc.high, fairPrice);
      acc.low = Math.min(acc.low, fairPrice);
      acc.close = fairPrice;
      acc.tickCount++;
    }

    // ── BROADCAST the tick to all subscribed clients ──
    broadcastChannel.send({
      type: 'broadcast',
      event: 'price_tick',
      payload: {
        asset_id: asset.id,
        ticker: asset.ticker,
        price: fairPrice,
        trend: asset.trendIndex,
        timestamp: Date.now()
      }
    });

    // ── Order Book: Post limit orders ──
    const botAsk = getRandomBot();
    const botBid = getRandomBot();
    const limitSpread = randRange(0.01, 0.08);
    const qtyToPost = Math.floor(randRange(50, 500));

    botAsk.client.rpc('execute_order', {
      p_user_id: botAsk.user.id, p_asset_id: asset.id, p_ticker: asset.ticker,
      p_order_type: 'Limit', p_side: 'sell', p_quantity: qtyToPost, p_price: fairPrice + limitSpread
    }).then(() => {});

    botBid.client.rpc('execute_order', {
      p_user_id: botBid.user.id, p_asset_id: asset.id, p_ticker: asset.ticker,
      p_order_type: 'Limit', p_side: 'buy', p_quantity: qtyToPost, p_price: fairPrice - limitSpread
    }).then(() => {});

    // Market sweep in trend direction
    const botSweep = getRandomBot();
    const sweepAction = asset.trendIndex > 0 ? 'buy' : asset.trendIndex < 0 ? 'sell' : (Math.random() > 0.5 ? 'buy' : 'sell');
    const sweepQty = Math.floor(randRange(10, qtyToPost));

    botSweep.client.rpc('execute_order', {
      p_user_id: botSweep.user.id, p_asset_id: asset.id, p_ticker: asset.ticker,
      p_order_type: 'Market', p_side: sweepAction, p_quantity: sweepQty, p_price: fairPrice
    }).then((res) => {
      if (res.data?.success && res.data?.status !== 'CANCELLED') {
        const acc = candleAccumulators[asset.id];
        if (acc) acc.volume += res.data.filled_qty || sweepQty;
        console.log(`[${asset.ticker}] ${sweepAction.toUpperCase()} ${sweepQty} @ ~${fairPrice.toFixed(2)} | Trend: ${asset.trendIndex}`);
      }
    });

  }, TICK_INTERVAL_MS);

  // ── 5. Candle Persistence Loop ──
  setInterval(flushCandles, CANDLE_FLUSH_MS);

  // ── 6. Data Retention Cleanup ──
  setInterval(cleanupOldData, CLEANUP_INTERVAL_MS);
  cleanupOldData();
}

bootMarketSimulation();
