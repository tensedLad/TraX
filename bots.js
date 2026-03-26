import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://lbbglktdggrdevgmmpnn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiYmdsa3RkZ2dyZGV2Z21tcG5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjUyMjQsImV4cCI6MjA5MDA0MTIyNH0.LZjTv3xaLWlkWdLj2UmJp-hl0AzH1CJibkgIJC0U8vY";

const NUM_BOTS = 5;
const bots = [];

const ticker = 'BANANA';
let currentPrice = 10.00;
let assetId = null;

async function setupBot(client, email, password, username) {
  await client.auth.signUp({ email, password, options: { data: { username } } });
  const { data: authData, error } = await client.auth.signInWithPassword({ email, password });
  if (error) { 
      console.error(`Error logging in ${email}:`, error.message); 
      return null; 
  }
  return authData.user;
}

async function giveHoldingsAndMoney(client, userId, aId, qty) {
  await client.from('holdings').upsert({ user_id: userId, asset_id: aId, ticker: ticker, quantity: qty, avg_buy_price: 10.00 }, { onConflict: 'user_id, asset_id' });
  await client.from('profiles').update({ balance: 500000000 }).eq('id', userId);
}

function randRange(min, max) { return Math.random() * (max - min) + min; }

async function runFakeMarket() {
  console.log(`Setting up ${NUM_BOTS} market bots...`);

  // Use a master client to get asset info
  const masterClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: assetData } = await masterClient.from('assets').select('id, current_price').eq('ticker', ticker).single();
  if (!assetData) return console.error("Asset not found!");
  
  assetId = assetData.id;
  currentPrice = Number(assetData.current_price) || 10.00;

  for (let i = 1; i <= NUM_BOTS; i++) {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const user = await setupBot(client, `bot${i}@trax.com`, 'traxbotpass123', `TradingBot_${i}`);
    if (user) {
      await giveHoldingsAndMoney(client, user.id, assetId, 10000000);
      bots.push({ client, user, name: `Bot ${i}` });
    }
  }

  console.log(`${bots.length} Bots ready. Beginning chaotic random trading for ${ticker}...`);

  // To prevent freezing Supabase, we use a single centralized interval that fires every 3 seconds
  // In each tick, it randomly selects 1 to 2 bots to perform an action.
  setInterval(async () => {
    // Determine random organic price drift
    currentPrice = Math.max(1, currentPrice + randRange(-0.15, 0.15));

    // Choose how many bots will act this tick (1 or 2)
    const actingBotsCount = Math.floor(randRange(1, 3));
    
    for (let c = 0; c < actingBotsCount; c++) {
      const bot = bots[Math.floor(Math.random() * bots.length)];
      if (!bot) continue;

      const roll = Math.random();
      const qty = Math.floor(randRange(10, 500));

      if (roll < 0.40) { // 40% chance: Limit BUY (below current price)
        const bidPrice = (currentPrice - randRange(0.01, 0.20)).toFixed(2);
        let res = await bot.client.rpc('execute_order', { p_user_id: bot.user.id, p_asset_id: assetId, p_ticker: ticker, p_order_type: 'Limit', p_side: 'buy', p_quantity: qty, p_price: Number(bidPrice) });
        if (res.data?.success) console.log(`[${bot.name}] Limit BUY ${qty} @ $${bidPrice}`);
        
      } else if (roll < 0.80) { // 40% chance: Limit SELL (above current price)
        const askPrice = (currentPrice + randRange(0.01, 0.20)).toFixed(2);
        let res = await bot.client.rpc('execute_order', { p_user_id: bot.user.id, p_asset_id: assetId, p_ticker: ticker, p_order_type: 'Limit', p_side: 'sell', p_quantity: qty, p_price: Number(askPrice) });
        if (res.data?.success) console.log(`[${bot.name}] Limit SELL ${qty} @ $${askPrice}`);

      } else if (roll < 0.90) { // 10% chance: Market BUY (eats asks)
        let res = await bot.client.rpc('execute_order', { p_user_id: bot.user.id, p_asset_id: assetId, p_ticker: ticker, p_order_type: 'Market', p_side: 'buy', p_quantity: Math.floor(qty / 2), p_price: currentPrice });
        if (res.data?.success && res.data?.status !== 'CANCELLED') console.log(`[${bot.name}] Market BUY => ${res.data.status}`);
        
      } else { // 10% chance: Market SELL (eats bids)
        let res = await bot.client.rpc('execute_order', { p_user_id: bot.user.id, p_asset_id: assetId, p_ticker: ticker, p_order_type: 'Market', p_side: 'sell', p_quantity: Math.floor(qty / 2), p_price: currentPrice });
        if (res.data?.success && res.data?.status !== 'CANCELLED') console.log(`[${bot.name}] Market SELL => ${res.data.status}`);
      }
    }
  }, 2500); // Evaluates every 2.5 seconds, executing 1 or 2 interactions (safe load)
}

runFakeMarket();
