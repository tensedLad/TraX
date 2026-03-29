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
const TICK_INTERVAL_MS = parseInt(process.env.TICK_INTERVAL_MS || '8000', 10);
const CANDLE_FLUSH_MS = parseInt(process.env.CANDLE_FLUSH_MS || '60000', 10);
const CLEANUP_INTERVAL_MS = parseInt(process.env.CLEANUP_INTERVAL_MS || '3600000', 10);
const DATA_RETENTION_HOURS = parseInt(process.env.DATA_RETENTION_HOURS || '24', 10);
// ──────────────────────────────────────────────────────────────

const bots = [];
const masterClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let activeAssets = [];

// ── In-memory candle accumulators (flushed to DB every CANDLE_FLUSH_MS) ──
const candleAccumulators = {};

// ── Broadcast channel for streaming live ticks to all clients ──
let broadcastChannel = null;

function randRange(min, max) { return Math.random() * (max - min) + min; }
function getRandomBot() { return bots[Math.floor(Math.random() * bots.length)]; }

// Returns a different bot than the one provided (for counterparty trades)
function getDifferentBot(excludeBot) {
  if (bots.length < 2) return excludeBot;
  let bot;
  do { bot = bots[Math.floor(Math.random() * bots.length)]; } while (bot === excludeBot);
  return bot;
}

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
  console.log(`[FLUSH] Candles persisted at ${now.toLocaleTimeString()}`);
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

  // Clean filled/cancelled orders
  const { error: orderErr } = await masterClient
    .from('orders')
    .delete()
    .in('status', ['FILLED', 'CANCELLED'])
    .lt('created_at', cutoff);
  if (orderErr) console.error('[CLEANUP] orders error:', orderErr.message);
}

// ══════════════════════════════════════════════════════════════
// PRICE SIMULATION ENGINE
//
// How real-world price discovery works:
//   1. Market makers place LIMIT orders on both sides (bid & ask)
//   2. Traders place MARKET orders that "sweep" through the book
//   3. Each fill sets a new `last trade price` → that IS the price
//   4. Supply > Demand → price drops. Demand > Supply → price rises
//
// Our simulation:
//   - Bots place limit orders around a "fair value" that DRIFTS
//   - The drift is small random walk influenced by sentiment
//   - Market orders sweep through these limits, creating real fills
//   - The `update_asset_on_trade` DB trigger updates current_price
//     to the ACTUAL LAST TRADE PRICE (not random noise)
//   - The broadcast to clients uses the REAL filled price
// ══════════════════════════════════════════════════════════════

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
    // Sentiment: -1 (bearish), 0 (neutral), +1 (bullish)
    sentiment: 0,
    // How volatile is this asset right now (0.1% to 2%)
    volatility: 0.005,
    // Tracks cumulative buy vs sell pressure from real users
    pressure: 0
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

  // 2. Create the broadcast channel
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

  // ══════════════════════════════════════════════════════════
  // 4. MARKET SIMULATION LOOP
  // ══════════════════════════════════════════════════════════
  setInterval(async () => {
    const asset = activeAssets[Math.floor(Math.random() * activeAssets.length)];

    // ── STEP 1: Drift sentiment (macro trend changes) ──
    // Sentiment shifts gradually, like news or market mood
    if (Math.random() > 0.85) {
      // Rare big shift (like news event)
      asset.sentiment = Math.random() > 0.5 ? 1 : -1;
      asset.volatility = randRange(0.008, 0.025);
    } else if (Math.random() > 0.7) {
      // Moderate shift
      asset.sentiment = Math.max(-1, Math.min(1,
        asset.sentiment + randRange(-0.3, 0.3)
      ));
    } else if (Math.random() > 0.9) {
      // Cool down to neutral
      asset.sentiment *= 0.5;
      asset.volatility = Math.max(0.003, asset.volatility * 0.9);
    }

    // ── STEP 2: Calculate fair value drift ──
    // Fair value shifts based on sentiment + small random noise
    // This simulates information asymmetry in real markets
    const sentimentDrift = asset.sentiment * asset.volatility * asset.price;
    const randomNoise = (Math.random() - 0.5) * asset.volatility * asset.price * 0.3;
    const pressureDrift = asset.pressure * 0.001 * asset.price; // user buy/sell pressure
    
    asset.price = Math.max(0.01, asset.price + sentimentDrift + randomNoise + pressureDrift);
    asset.pressure *= 0.8; // decay pressure over time

    const fairPrice = Math.round(asset.price * 100) / 100;

    // ── STEP 3: Market makers place LIMIT orders around fair value ──
    // This creates the order book depth that real users trade against.
    // Spread is wider when volatility is high (realistic behavior)
    const baseSpread = fairPrice * randRange(0.001, 0.005); // 0.1% - 0.5% spread
    const volSpread = fairPrice * asset.volatility * 0.5;   // wider spread in volatile market
    const halfSpread = baseSpread + volSpread;

    const askPrice = Math.round((fairPrice + halfSpread) * 100) / 100;
    const bidPrice = Math.round((fairPrice - halfSpread) * 100) / 100;
    const bookQty = Math.floor(randRange(100, 800));

    const makerAsk = getRandomBot();
    const makerBid = getDifferentBot(makerAsk);

    // Post limit sell (ask)
    makerAsk.client.rpc('execute_order', {
      p_user_id: makerAsk.user.id, p_asset_id: asset.id, p_ticker: asset.ticker,
      p_order_type: 'Limit', p_side: 'sell', p_quantity: bookQty, p_price: askPrice
    }).then(() => {});

    // Post limit buy (bid)
    makerBid.client.rpc('execute_order', {
      p_user_id: makerBid.user.id, p_asset_id: asset.id, p_ticker: asset.ticker,
      p_order_type: 'Limit', p_side: 'buy', p_quantity: bookQty, p_price: bidPrice
    }).then(() => {});

    // ── STEP 4: Market taker sweeps the book (creates price movement) ──
    // This is what actually MOVES the price.
    // The market order matches against the limit orders above.
    // Buy market orders → fill at ASK → price = ask price (goes UP)
    // Sell market orders → fill at BID → price = bid price (goes DOWN)
    const taker = getDifferentBot(makerAsk);
    
    // Determine sweep direction from sentiment + randomness
    let sweepSide;
    if (asset.sentiment > 0.3) {
      sweepSide = Math.random() > 0.2 ? 'buy' : 'sell';  // 80% buy in bullish
    } else if (asset.sentiment < -0.3) {
      sweepSide = Math.random() > 0.2 ? 'sell' : 'buy';  // 80% sell in bearish
    } else {
      sweepSide = Math.random() > 0.5 ? 'buy' : 'sell';  // 50/50 neutral
    }

    // Size: bigger in volatile markets, smaller in calm
    const sweepQty = Math.floor(randRange(20, bookQty * 0.6));

    taker.client.rpc('execute_order', {
      p_user_id: taker.user.id, p_asset_id: asset.id, p_ticker: asset.ticker,
      p_order_type: 'Market', p_side: sweepSide, p_quantity: sweepQty,
      p_price: sweepSide === 'buy' ? askPrice : bidPrice
    }).then((res) => {
      if (res.data?.success && res.data?.status !== 'CANCELLED') {
        const filledPrice = res.data.avg_price || fairPrice;
        const filledQty = res.data.filled_qty || sweepQty;

        // ── UPDATE the in-memory price to the ACTUAL fill price ──
        // This is the key fix: the price IS the last trade, not random
        asset.price = Number(filledPrice);

        // Update candle accumulator with real trade data
        const currentMinuteTs = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
        const acc = candleAccumulators[asset.id];

        if (acc.minuteTs !== currentMinuteTs) {
          candleAccumulators[asset.id] = {
            open: Number(filledPrice),
            high: Number(filledPrice),
            low: Number(filledPrice),
            close: Number(filledPrice),
            volume: filledQty,
            tickCount: 1,
            minuteTs: currentMinuteTs
          };
        } else {
          acc.high = Math.max(acc.high, Number(filledPrice));
          acc.low = Math.min(acc.low, Number(filledPrice));
          acc.close = Number(filledPrice);
          acc.volume += filledQty;
          acc.tickCount++;
        }

        // ── BROADCAST real price to all clients ──
        broadcastChannel.send({
          type: 'broadcast',
          event: 'price_tick',
          payload: {
            asset_id: asset.id,
            ticker: asset.ticker,
            price: Number(filledPrice),
            trend: asset.sentiment > 0.3 ? 1 : asset.sentiment < -0.3 ? -1 : 0,
            timestamp: Date.now()
          }
        });

        console.log(
          `[${asset.ticker}] ${sweepSide.toUpperCase()} ${filledQty} @ ₮${Number(filledPrice).toFixed(2)} ` +
          `| Spread: ${bidPrice.toFixed(2)}-${askPrice.toFixed(2)} ` +
          `| Sentiment: ${asset.sentiment.toFixed(2)}`
        );
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
