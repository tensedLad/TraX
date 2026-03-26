-- ============================================================
-- TraX Trading Platform - Supabase Database Schema
-- Run this ENTIRE script in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================

-- ==========================================
-- 1. PROFILES TABLE (extends Supabase auth.users)
-- ==========================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_initials TEXT DEFAULT 'TR',
  balance NUMERIC(15,2) DEFAULT 10000.00,  -- Starting balance ₮10,000
  total_trades INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies: Users can read all profiles but only update their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_initials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'Trader_' || LEFT(NEW.id::text, 6)),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'username', 'TR'), 2))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- 2. ASSETS TABLE (Tradable items on the platform)
-- ==========================================
CREATE TABLE public.assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT UNIQUE NOT NULL,         -- e.g., 'BANANA'
  name TEXT NOT NULL,                  -- e.g., 'Banana Stand Inc.'
  category TEXT DEFAULT 'Physical',    -- 'Physical', 'Commodity', 'Meme Stock'
  description TEXT,
  ipo_price NUMERIC(15,2) NOT NULL,
  current_price NUMERIC(15,2) NOT NULL,
  previous_price NUMERIC(15,2),        -- for calculating % change
  total_supply INTEGER DEFAULT 1000000,
  circulating_supply INTEGER DEFAULT 0,
  change_24h NUMERIC(8,4) DEFAULT 0,   -- percentage change
  volume_24h NUMERIC(15,2) DEFAULT 0,
  high_24h NUMERIC(15,2),
  low_24h NUMERIC(15,2),
  status TEXT DEFAULT 'ACTIVE',        -- 'ACTIVE', 'IPO', 'HALTED'
  listed_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assets are viewable by everyone" ON public.assets
  FOR SELECT USING (true);

-- Only service role can insert/update assets (admin operations)
CREATE POLICY "Service role can manage assets" ON public.assets
  FOR ALL USING (auth.role() = 'service_role');

-- Seed some initial assets
INSERT INTO public.assets (ticker, name, category, ipo_price, current_price, previous_price, change_24h, volume_24h, high_24h, low_24h, status) VALUES
  ('BANANA', 'Banana Stand Inc.', 'Meme Stock', 10.00, 14.20, 13.63, 4.20, 125000.00, 14.50, 13.10, 'ACTIVE'),
  ('GOLD', 'Digital Gold Reserve', 'Commodity', 50.00, 88.00, 85.50, 2.92, 340000.00, 89.00, 84.00, 'ACTIVE'),
  ('SKIBIDI', 'Skibidi Entertainment', 'Meme Stock', 5.00, 2.40, 2.60, -7.69, 89000.00, 3.00, 2.20, 'ACTIVE'),
  ('COLDPLAY', 'Coldplay Concert Futures', 'Physical', 50.00, 88.00, 82.00, 7.32, 56000.00, 90.00, 80.00, 'ACTIVE'),
  ('OIL', 'Crude Oil Barrel', 'Commodity', 70.00, 73.50, 72.80, 0.96, 210000.00, 74.00, 71.50, 'ACTIVE'),
  ('POKEMON', 'Charizard Card Fund', 'Physical', 100.00, 142.00, 138.00, 2.90, 45000.00, 145.00, 135.00, 'ACTIVE'),
  ('DOGE', 'Classic Doge Meme', 'Meme Stock', 1.00, 0.42, 0.45, -6.67, 500000.00, 0.50, 0.38, 'IPO'),
  ('ROLEX', 'Rolex Daytona', 'Physical', 200.00, 220.00, 215.00, 2.33, 12000.00, 225.00, 210.00, 'IPO');


-- ==========================================
-- 3. PRICE HISTORY TABLE (for charts)
-- ==========================================
CREATE TABLE public.price_history (
  id BIGSERIAL PRIMARY KEY,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  ticker TEXT NOT NULL,
  open NUMERIC(15,2) NOT NULL,
  high NUMERIC(15,2) NOT NULL,
  low NUMERIC(15,2) NOT NULL,
  close NUMERIC(15,2) NOT NULL,
  volume NUMERIC(15,2) DEFAULT 0,
  interval TEXT DEFAULT '5m',          -- '1m', '5m', '1h', '1D'
  timestamp TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Price history is viewable by everyone" ON public.price_history
  FOR SELECT USING (true);

-- Index for fast chart queries
CREATE INDEX idx_price_history_asset_interval ON public.price_history (asset_id, interval, timestamp DESC);
CREATE INDEX idx_price_history_ticker ON public.price_history (ticker, interval, timestamp DESC);


-- ==========================================
-- 4. ORDERS TABLE (Buy/Sell orders)
-- ==========================================
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  ticker TEXT NOT NULL,
  order_type TEXT NOT NULL,            -- 'Market', 'Limit', 'Stop Loss'
  side TEXT NOT NULL,                  -- 'buy' or 'sell'
  quantity NUMERIC(15,4) NOT NULL,
  price NUMERIC(15,2) NOT NULL,
  total NUMERIC(15,2) NOT NULL,
  status TEXT DEFAULT 'PENDING',       -- 'PENDING', 'FILLED', 'CANCELLED', 'PARTIAL'
  filled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users can see their own orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id);


-- ==========================================
-- 5. PORTFOLIO / HOLDINGS TABLE
-- ==========================================
CREATE TABLE public.holdings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  ticker TEXT NOT NULL,
  quantity NUMERIC(15,4) DEFAULT 0,
  avg_buy_price NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, asset_id)
);

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own holdings" ON public.holdings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own holdings" ON public.holdings
  FOR ALL USING (auth.uid() = user_id);


-- ==========================================
-- 6. TRADE HISTORY TABLE (filled trades for activity feed)
-- ==========================================
CREATE TABLE public.trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  ticker TEXT NOT NULL,
  side TEXT NOT NULL,                  -- 'buy' or 'sell'
  quantity NUMERIC(15,4) NOT NULL,
  price NUMERIC(15,2) NOT NULL,
  total NUMERIC(15,2) NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Public trade feed (everyone can see recent trades)
CREATE POLICY "Trades are viewable by everyone" ON public.trades
  FOR SELECT USING (true);

CREATE POLICY "System can insert trades" ON public.trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ==========================================
-- 7. PROPOSALS TABLE (Asset proposals with voting)
-- ==========================================
CREATE TABLE public.proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset_name TEXT NOT NULL,
  ticker TEXT UNIQUE NOT NULL,
  category TEXT DEFAULT 'Physical',
  description TEXT,
  ipo_price NUMERIC(15,2) NOT NULL,
  total_supply INTEGER DEFAULT 100000,
  votes INTEGER DEFAULT 0,
  votes_needed INTEGER DEFAULT 50,
  status TEXT DEFAULT 'ACTIVE',        -- 'ACTIVE', 'APPROVED', 'REJECTED'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Proposals are viewable by everyone" ON public.proposals
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create proposals" ON public.proposals
  FOR INSERT WITH CHECK (auth.uid() = proposer_id);


-- ==========================================
-- 8. VOTES TABLE
-- ==========================================
CREATE TABLE public.votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, proposal_id)        -- One vote per user per proposal
);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes are viewable by everyone" ON public.votes
  FOR SELECT USING (true);

CREATE POLICY "Users can cast their own votes" ON public.votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ==========================================
-- 9. LEADERBOARD VIEW (Rich List)
-- ==========================================
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  p.id,
  p.username,
  p.avatar_initials,
  p.balance,
  p.total_trades,
  COALESCE(SUM(h.quantity * a.current_price), 0) AS portfolio_value,
  p.balance + COALESCE(SUM(h.quantity * a.current_price), 0) AS net_worth
FROM public.profiles p
LEFT JOIN public.holdings h ON h.user_id = p.id
LEFT JOIN public.assets a ON a.id = h.asset_id
GROUP BY p.id, p.username, p.avatar_initials, p.balance, p.total_trades
ORDER BY net_worth DESC;


-- ==========================================
-- 10. ENABLE REALTIME
-- ==========================================
-- Enable realtime on tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;


-- ==========================================
-- 11. HELPER FUNCTION: Execute a Trade
-- ==========================================
CREATE OR REPLACE FUNCTION public.execute_market_order(
  p_user_id UUID,
  p_asset_id UUID,
  p_ticker TEXT,
  p_side TEXT,
  p_quantity NUMERIC,
  p_price NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_total NUMERIC;
  v_current_balance NUMERIC;
  v_current_holding RECORD;
BEGIN
  v_total := p_quantity * p_price;

  -- Get current balance
  SELECT balance INTO v_current_balance FROM public.profiles WHERE id = p_user_id;

  IF p_side = 'buy' THEN
    -- Check sufficient balance
    IF v_current_balance < v_total THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- Deduct balance
    UPDATE public.profiles SET balance = balance - v_total, total_trades = total_trades + 1, updated_at = now() WHERE id = p_user_id;

    -- Update or insert holding
    INSERT INTO public.holdings (user_id, asset_id, ticker, quantity, avg_buy_price)
    VALUES (p_user_id, p_asset_id, p_ticker, p_quantity, p_price)
    ON CONFLICT (user_id, asset_id)
    DO UPDATE SET
      avg_buy_price = (holdings.avg_buy_price * holdings.quantity + p_price * p_quantity) / (holdings.quantity + p_quantity),
      quantity = holdings.quantity + p_quantity,
      updated_at = now();

  ELSIF p_side = 'sell' THEN
    -- Check sufficient holdings
    SELECT * INTO v_current_holding FROM public.holdings WHERE user_id = p_user_id AND asset_id = p_asset_id;

    IF v_current_holding IS NULL OR v_current_holding.quantity < p_quantity THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient holdings');
    END IF;

    -- Add balance
    UPDATE public.profiles SET balance = balance + v_total, total_trades = total_trades + 1, updated_at = now() WHERE id = p_user_id;

    -- Reduce holding
    IF v_current_holding.quantity = p_quantity THEN
      DELETE FROM public.holdings WHERE user_id = p_user_id AND asset_id = p_asset_id;
    ELSE
      UPDATE public.holdings SET quantity = quantity - p_quantity, updated_at = now() WHERE user_id = p_user_id AND asset_id = p_asset_id;
    END IF;
  END IF;

  -- Record the trade
  INSERT INTO public.trades (user_id, asset_id, ticker, side, quantity, price, total)
  VALUES (p_user_id, p_asset_id, p_ticker, p_side, p_quantity, p_price, v_total);

  -- Record the order
  INSERT INTO public.orders (user_id, asset_id, ticker, order_type, side, quantity, price, total, status, filled_at)
  VALUES (p_user_id, p_asset_id, p_ticker, 'Market', p_side, p_quantity, p_price, v_total, 'FILLED', now());

  RETURN json_build_object('success', true, 'total', v_total, 'new_balance', v_current_balance - (CASE WHEN p_side = 'buy' THEN v_total ELSE -v_total END));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 12. SEED PRICE HISTORY DATA (for charts)
-- ==========================================
-- Generate 40 candles for BANANA (5m interval)
DO $$
DECLARE
  v_asset_id UUID;
  v_price NUMERIC := 12.50;
  v_open NUMERIC;
  v_close NUMERIC;
  v_high NUMERIC;
  v_low NUMERIC;
  v_change NUMERIC;
  v_ts TIMESTAMPTZ := now() - INTERVAL '200 minutes';
BEGIN
  SELECT id INTO v_asset_id FROM public.assets WHERE ticker = 'BANANA';

  FOR i IN 1..40 LOOP
    v_open := v_price;
    v_change := (random() - 0.48) * 0.6;
    v_close := v_open + v_change;
    v_high := GREATEST(v_open, v_close) + random() * 0.3;
    v_low  := LEAST(v_open, v_close) - random() * 0.3;

    INSERT INTO public.price_history (asset_id, ticker, open, high, low, close, volume, interval, timestamp)
    VALUES (v_asset_id, 'BANANA', ROUND(v_open::numeric, 2), ROUND(v_high::numeric, 2), ROUND(v_low::numeric, 2), ROUND(v_close::numeric, 2), ROUND((random() * 5000)::numeric, 2), '5m', v_ts);

    v_price := v_close;
    v_ts := v_ts + INTERVAL '5 minutes';
  END LOOP;
END $$;


-- ==========================================
-- 13. NOTIFICATIONS TABLE
-- ==========================================
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',     -- 'trade_success', 'alert', 'info'
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: Automatically notify user on trade execution
CREATE OR REPLACE FUNCTION public.notify_on_trade()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.user_id,
    'Order Filled',
    'Your ' || UPPER(NEW.side) || ' order for ' || NEW.quantity || ' ' || NEW.ticker || ' was filled at ₮' || NEW.price || '.',
    'trade_success'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trade_executed
  AFTER INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_trade();


-- ==========================================
-- 14. DYNAMIC PRICE HISTORY CHARTING
-- ==========================================
-- Automatically log or update a 1m candle when a trade executes
CREATE OR REPLACE FUNCTION public.update_price_history_on_trade()
RETURNS TRIGGER AS $$
DECLARE
  v_current_minute TIMESTAMPTZ := date_trunc('minute', NEW.executed_at);
  v_existing_id UUID;
  v_open NUMERIC;
  v_high NUMERIC;
  v_low NUMERIC;
  v_volume NUMERIC;
BEGIN
  -- Check if a 1m candle already exists for this asset in the exact current minute
  SELECT id, open, high, low, volume 
  INTO v_existing_id, v_open, v_high, v_low, v_volume
  FROM public.price_history
  WHERE asset_id = NEW.asset_id 
    AND interval = '1m' 
    AND timestamp = v_current_minute;

  IF FOUND THEN
    -- Update the existing minute candle (stretch high/low, update close, add volume)
    UPDATE public.price_history
    SET 
      high = GREATEST(v_high, NEW.price),
      low = LEAST(v_low, NEW.price),
      close = NEW.price,
      volume = v_volume + NEW.quantity
    WHERE id = v_existing_id;
  ELSE
    -- No candle for this minute. Find the last known close price to use as the new Open.
    SELECT close INTO v_open
    FROM public.price_history
    WHERE asset_id = NEW.asset_id AND interval = '1m'
    ORDER BY timestamp DESC
    LIMIT 1;

    -- If there's literally no history at all for this asset, just use the trade price as the open.
    IF v_open IS NULL THEN
      v_open := NEW.price;
    END IF;

    -- Create a brand new 1m candle
    INSERT INTO public.price_history (asset_id, ticker, open, high, low, close, volume, interval, timestamp)
    VALUES (
      NEW.asset_id,
      NEW.ticker,
      v_open,
      GREATEST(v_open, NEW.price),
      LEAST(v_open, NEW.price),
      NEW.price,
      NEW.quantity,
      '1m',
      v_current_minute
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trade_charted
  AFTER INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.update_price_history_on_trade();


-- ============================================================
-- 15. DYNAMIC ASSET METRICS (High/Low/Current Price)
-- ============================================================
-- Automatically updates the asset's current price, high, and low when trades happen.
CREATE OR REPLACE FUNCTION public.update_asset_metrics_on_trade()
RETURNS TRIGGER AS $$
BEGIN
  -- If we're starting fresh, high/low might need snapping to the first trade price
  UPDATE public.assets
  SET 
    current_price = NEW.price,
    high_24h = CASE WHEN volume_24h = 0 THEN NEW.price ELSE GREATEST(high_24h, NEW.price) END,
    low_24h = CASE WHEN volume_24h = 0 THEN NEW.price ELSE LEAST(low_24h, NEW.price) END,
    volume_24h = volume_24h + NEW.quantity,
    updated_at = now()
  WHERE id = NEW.asset_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trade_metrics_update
  AFTER INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.update_asset_metrics_on_trade();


-- ============================================================
-- DONE! Your TraX database is ready.
-- ============================================================
