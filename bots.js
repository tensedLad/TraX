import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://lbbglktdggrdevgmmpnn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiYmdsa3RkZ2dyZGV2Z21tcG5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjUyMjQsImV4cCI6MjA5MDA0MTIyNH0.LZjTv3xaLWlkWdLj2UmJp-hl0AzH1CJibkgIJC0U8vY";

const NUM_BOTS = 10;
const bots = [];

const masterClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let activeAssets = []; // Array of objects containing id, ticker, price, trend, volatility

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
  // Give a giant balance
  await client.from('profiles').update({ balance: 500000000 }).eq('id', userId);
  
  // Give giant holdings for every active asset
  for (const asset of activeAssets) {
    await client.from('holdings').upsert(
      { user_id: userId, asset_id: asset.id, ticker: asset.ticker, quantity: 10000000, avg_buy_price: asset.price }, 
      { onConflict: 'user_id, asset_id' }
    );
  }
}

function randRange(min, max) { return Math.random() * (max - min) + min; }
function getRandomBot() { return bots[Math.floor(Math.random() * bots.length)]; }

async function bootMarketSimulation() {
  console.log(`Setting up Market Makers...`);

  // 1. Fetch ALL active assets
  const { data: assetData } = await masterClient.from('assets').select('id, ticker, current_price').eq('status', 'ACTIVE');
  if (!assetData || assetData.length === 0) return console.error("No active assets found!");

  // Track organic trends for "real life" non-random behavior
  activeAssets = assetData.map(a => ({
      id: a.id,
      ticker: a.ticker,
      price: Number(a.current_price) || 10.00,
      trendIndex: 0, // 0 = neutral, 1 = up, -1 = down
      momentum: 0.1 // intensity of the trend
  }));

  // 2. Initialize the 10 High Frequency bots
  for (let i = 1; i <= NUM_BOTS; i++) {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const user = await setupBot(client, `mm_bot_${i}@trax.com`, 'traxmmbot123', `Market_Maker_${i}`);
    if (user) {
      await giveHoldingsAndMoney(client, user.id);
      bots.push({ client, user, name: `MM-${i}` });
      process.stdout.write(`*`); // Progress marker
    }
  }

  console.log(`\nReady! ${bots.length} Market Makers activated across ${activeAssets.length} assets.`);

  // 3. The Central Trading Loop (Tick)
  // We fire every 1.25 seconds. On every tick, we pick 2 random assets to trade.
  // This causes natural fast-paced organic trading streams.
  setInterval(async () => {
    
    // Pick 1 random asset each cycle to reduce DB connection pool saturation
    const tickAssets = [];
    tickAssets.push(activeAssets[Math.floor(Math.random() * activeAssets.length)]);


    for (const asset of tickAssets) {
        // Shift trend randomly occasionally (every ~20 seconds per asset theoretically)
        if (Math.random() > 0.8) {
            asset.trendIndex = Math.random() > 0.5 ? 1 : -1;
            asset.momentum = randRange(0.01, 0.10); // How hard the trend pushes
        } else if (Math.random() > 0.9) {
            asset.trendIndex = 0; // go neutral/sideways
        }

        // Apply trend to target fair value price
        let noise = randRange(-0.02, 0.02);
        let move = (asset.trendIndex * asset.momentum) + noise;
        
        // Ensure price doesn't go below 0.01
        let fairPrice = Math.max(0.01, asset.price + move);
        asset.price = fairPrice; // Update internal tracker

        // Market Making: Two bots place surrounding limits to build the order book depth
        let botAsk = getRandomBot();
        let botBid = getRandomBot();
        
        const limitSpread = randRange(0.01, 0.08);
        const qtyToPost = Math.floor(randRange(50, 1000));
        
        // Fire limits (fire and forget for latency mimicking)
        botAsk.client.rpc('execute_order', { 
            p_user_id: botAsk.user.id, p_asset_id: asset.id, p_ticker: asset.ticker, 
            p_order_type: 'Limit', p_side: 'sell', p_quantity: qtyToPost, p_price: (fairPrice + limitSpread) 
        }).then(() => {});

        botBid.client.rpc('execute_order', { 
            p_user_id: botBid.user.id, p_asset_id: asset.id, p_ticker: asset.ticker, 
            p_order_type: 'Limit', p_side: 'buy', p_quantity: qtyToPost, p_price: (fairPrice - limitSpread) 
        }).then(() => {});

        // Market Action: A third bot sweeps in the direction of the trend to eat the limit orders and cause an actual trade jump
        let botSweep = getRandomBot();
        const sweepAction = asset.trendIndex > 0 ? 'buy' : asset.trendIndex < 0 ? 'sell' : (Math.random() > 0.5 ? 'buy' : 'sell');
        const sweepQty = Math.floor(randRange(10, qtyToPost)); // Sweeps partial or full of the limit
        
        botSweep.client.rpc('execute_order', { 
            p_user_id: botSweep.user.id, p_asset_id: asset.id, p_ticker: asset.ticker, 
            p_order_type: 'Market', p_side: sweepAction, p_quantity: sweepQty, p_price: fairPrice 
        }).then((res) => {
            if (res.data?.success && res.data?.status !== 'CANCELLED') {
                console.log(`[${asset.ticker}] ${sweepAction.toUpperCase()} ${sweepQty} @ ~${fairPrice.toFixed(2)} | Trend: ${asset.trendIndex}`);
            }
        });
    }

  }, 3000); 
}

bootMarketSimulation();
