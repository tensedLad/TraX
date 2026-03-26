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
-- 11. ORDER MATCHING ENGINE
-- ==========================================

-- Allow everyone to see PENDING limit orders (for order book display)
CREATE POLICY "Everyone can view pending orders for order book" ON public.orders
  FOR SELECT USING (status = 'PENDING' AND order_type = 'Limit');

CREATE OR REPLACE FUNCTION public.get_order_book(p_asset_id UUID)
RETURNS JSON AS $$
DECLARE
  v_asks JSON;
  v_bids JSON;
BEGIN
  SELECT COALESCE(json_agg(json_build_object('p', a.price, 'q', a.total_qty) ORDER BY a.price ASC), '[]'::json)
  INTO v_asks
  FROM (
    SELECT price, SUM(quantity)::NUMERIC AS total_qty
    FROM public.orders
    WHERE asset_id = p_asset_id AND side = 'sell' AND status = 'PENDING' AND order_type = 'Limit'
    GROUP BY price
    ORDER BY price ASC
    LIMIT 15
  ) a;

  SELECT COALESCE(json_agg(json_build_object('p', b.price, 'q', b.total_qty) ORDER BY b.price DESC), '[]'::json)
  INTO v_bids
  FROM (
    SELECT price, SUM(quantity)::NUMERIC AS total_qty
    FROM public.orders
    WHERE asset_id = p_asset_id AND side = 'buy' AND status = 'PENDING' AND order_type = 'Limit'
    GROUP BY price
    ORDER BY price DESC
    LIMIT 15
  ) b;

  RETURN json_build_object('asks', v_asks, 'bids', v_bids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.execute_order(
  p_user_id UUID,
  p_asset_id UUID,
  p_ticker TEXT,
  p_order_type TEXT,
  p_side TEXT,
  p_quantity NUMERIC,
  p_price NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_remaining NUMERIC := p_quantity;
  v_total_cost NUMERIC := 0;
  v_filled_qty NUMERIC := 0;
  v_balance NUMERIC;
  v_holding_qty NUMERIC;
  v_order_id UUID;
  v_counter RECORD;
  v_fill_qty NUMERIC;
  v_fill_price NUMERIC;
  v_fill_total NUMERIC;
BEGIN
  -- === PRE-VALIDATION ===
  SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF p_side = 'buy' THEN
    IF p_order_type = 'Limit' AND v_balance < p_quantity * p_price THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient balance. Need ₮' || ROUND(p_quantity * p_price, 2)::TEXT);
    END IF;
  ELSIF p_side = 'sell' THEN
    SELECT COALESCE(quantity, 0) INTO v_holding_qty
    FROM public.holdings WHERE user_id = p_user_id AND asset_id = p_asset_id FOR UPDATE;
    IF v_holding_qty IS NULL OR v_holding_qty < p_quantity THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient holdings. You have ' || COALESCE(v_holding_qty, 0)::TEXT || ' shares.');
    END IF;
  END IF;

  -- === RESERVE FOR LIMIT ORDERS ===
  IF p_order_type = 'Limit' THEN
    IF p_side = 'buy' THEN
      UPDATE public.profiles SET balance = balance - (p_quantity * p_price), updated_at = now() WHERE id = p_user_id;
    ELSIF p_side = 'sell' THEN
      UPDATE public.holdings SET quantity = quantity - p_quantity, updated_at = now()
      WHERE user_id = p_user_id AND asset_id = p_asset_id;
      DELETE FROM public.holdings WHERE user_id = p_user_id AND asset_id = p_asset_id AND quantity <= 0;
    END IF;
  END IF;

  -- === CREATE ORDER ===
  INSERT INTO public.orders (user_id, asset_id, ticker, order_type, side, quantity, price, total, status)
  VALUES (p_user_id, p_asset_id, p_ticker, p_order_type, p_side, p_quantity, p_price, p_quantity * p_price, 'PENDING')
  RETURNING id INTO v_order_id;

  -- === MATCHING: BUY SIDE ===
  IF p_side = 'buy' THEN
    FOR v_counter IN
      SELECT * FROM public.orders
      WHERE asset_id = p_asset_id AND side = 'sell' AND status = 'PENDING'
        AND order_type = 'Limit' AND id != v_order_id
        AND (p_order_type = 'Market' OR price <= p_price)
      ORDER BY price ASC, created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_fill_qty := LEAST(v_remaining, v_counter.quantity);
      v_fill_price := v_counter.price;
      v_fill_total := v_fill_qty * v_fill_price;

      IF p_order_type = 'Market' THEN
        SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id;
        IF v_balance < v_fill_total THEN EXIT; END IF;
        UPDATE public.profiles SET balance = balance - v_fill_total, total_trades = total_trades + 1, updated_at = now() WHERE id = p_user_id;
      ELSE
        IF v_fill_price < p_price THEN
          UPDATE public.profiles SET balance = balance + v_fill_qty * (p_price - v_fill_price), updated_at = now() WHERE id = p_user_id;
        END IF;
        UPDATE public.profiles SET total_trades = total_trades + 1, updated_at = now() WHERE id = p_user_id;
      END IF;

      -- Seller gets paid
      UPDATE public.profiles SET balance = balance + v_fill_total, total_trades = total_trades + 1, updated_at = now() WHERE id = v_counter.user_id;

      -- Buyer gets holdings
      INSERT INTO public.holdings (user_id, asset_id, ticker, quantity, avg_buy_price)
      VALUES (p_user_id, p_asset_id, p_ticker, v_fill_qty, v_fill_price)
      ON CONFLICT (user_id, asset_id) DO UPDATE SET
        avg_buy_price = (holdings.avg_buy_price * holdings.quantity + v_fill_price * v_fill_qty) / (holdings.quantity + v_fill_qty),
        quantity = holdings.quantity + v_fill_qty, updated_at = now();

      -- Record trades
      INSERT INTO public.trades (user_id, asset_id, ticker, side, quantity, price, total)
      VALUES (p_user_id, p_asset_id, p_ticker, 'buy', v_fill_qty, v_fill_price, v_fill_total);
      INSERT INTO public.trades (user_id, asset_id, ticker, side, quantity, price, total)
      VALUES (v_counter.user_id, p_asset_id, p_ticker, 'sell', v_fill_qty, v_fill_price, v_fill_total);

      -- Update counterparty order
      IF v_fill_qty >= v_counter.quantity THEN
        UPDATE public.orders SET status = 'FILLED', filled_at = now() WHERE id = v_counter.id;
      ELSE
        UPDATE public.orders SET quantity = quantity - v_fill_qty, total = (quantity - v_fill_qty) * price WHERE id = v_counter.id;
      END IF;

      v_remaining := v_remaining - v_fill_qty;
      v_filled_qty := v_filled_qty + v_fill_qty;
      v_total_cost := v_total_cost + v_fill_total;
    END LOOP;

  -- === MATCHING: SELL SIDE ===
  ELSIF p_side = 'sell' THEN
    FOR v_counter IN
      SELECT * FROM public.orders
      WHERE asset_id = p_asset_id AND side = 'buy' AND status = 'PENDING'
        AND order_type = 'Limit' AND id != v_order_id
        AND (p_order_type = 'Market' OR price >= p_price)
      ORDER BY price DESC, created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_fill_qty := LEAST(v_remaining, v_counter.quantity);
      v_fill_price := v_counter.price;
      v_fill_total := v_fill_qty * v_fill_price;

      IF p_order_type = 'Market' THEN
        UPDATE public.holdings SET quantity = quantity - v_fill_qty, updated_at = now()
        WHERE user_id = p_user_id AND asset_id = p_asset_id;
        UPDATE public.profiles SET balance = balance + v_fill_total, total_trades = total_trades + 1, updated_at = now() WHERE id = p_user_id;
      ELSE
        UPDATE public.profiles SET balance = balance + v_fill_total, total_trades = total_trades + 1, updated_at = now() WHERE id = p_user_id;
      END IF;

      -- Buyer gets holdings
      UPDATE public.profiles SET total_trades = total_trades + 1, updated_at = now() WHERE id = v_counter.user_id;
      INSERT INTO public.holdings (user_id, asset_id, ticker, quantity, avg_buy_price)
      VALUES (v_counter.user_id, p_asset_id, p_ticker, v_fill_qty, v_fill_price)
      ON CONFLICT (user_id, asset_id) DO UPDATE SET
        avg_buy_price = (holdings.avg_buy_price * holdings.quantity + v_fill_price * v_fill_qty) / (holdings.quantity + v_fill_qty),
        quantity = holdings.quantity + v_fill_qty, updated_at = now();

      -- Record trades
      INSERT INTO public.trades (user_id, asset_id, ticker, side, quantity, price, total)
      VALUES (p_user_id, p_asset_id, p_ticker, 'sell', v_fill_qty, v_fill_price, v_fill_total);
      INSERT INTO public.trades (user_id, asset_id, ticker, side, quantity, price, total)
      VALUES (v_counter.user_id, p_asset_id, p_ticker, 'buy', v_fill_qty, v_fill_price, v_fill_total);

      -- Update counterparty order
      IF v_fill_qty >= v_counter.quantity THEN
        UPDATE public.orders SET status = 'FILLED', filled_at = now() WHERE id = v_counter.id;
      ELSE
        UPDATE public.orders SET quantity = quantity - v_fill_qty, total = (quantity - v_fill_qty) * price WHERE id = v_counter.id;
      END IF;

      v_remaining := v_remaining - v_fill_qty;
      v_filled_qty := v_filled_qty + v_fill_qty;
      v_total_cost := v_total_cost + v_fill_total;
    END LOOP;

    IF p_order_type = 'Market' THEN
      DELETE FROM public.holdings WHERE user_id = p_user_id AND asset_id = p_asset_id AND quantity <= 0;
    END IF;
  END IF;

  -- === FINALIZE ORDER STATUS ===
  IF v_remaining <= 0 THEN
    UPDATE public.orders SET status = 'FILLED', filled_at = now() WHERE id = v_order_id;
  ELSIF v_filled_qty > 0 THEN
    IF p_order_type = 'Market' THEN
      UPDATE public.orders SET status = 'PARTIAL', quantity = v_filled_qty, total = v_total_cost, filled_at = now() WHERE id = v_order_id;
    ELSE
      UPDATE public.orders SET quantity = v_remaining, total = v_remaining * p_price WHERE id = v_order_id;
    END IF;
  ELSE
    IF p_order_type = 'Market' THEN
      UPDATE public.orders SET status = 'CANCELLED' WHERE id = v_order_id;
      IF p_side = 'buy' THEN
        RETURN json_build_object('success', false, 'error', 'No sellers available. Place a limit sell order first to add liquidity.');
      ELSE
        RETURN json_build_object('success', false, 'error', 'No buyers available. Place a limit buy order first to add liquidity.');
      END IF;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'filled_qty', v_filled_qty,
    'remaining_qty', GREATEST(v_remaining, 0),
    'avg_price', CASE WHEN v_filled_qty > 0 THEN ROUND(v_total_cost / v_filled_qty, 2) ELSE 0 END,
    'total_cost', ROUND(v_total_cost, 2),
    'order_id', v_order_id,
    'status', CASE
      WHEN v_remaining <= 0 THEN 'FILLED'
      WHEN v_filled_qty > 0 AND p_order_type = 'Market' THEN 'PARTIAL'
      WHEN v_filled_qty > 0 THEN 'PARTIAL'
      ELSE 'PENDING'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.cancel_order(p_user_id UUID, p_order_id UUID)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders
  WHERE id = p_order_id AND user_id = p_user_id AND status = 'PENDING'
  FOR UPDATE;

  IF v_order IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Order not found or already filled/cancelled.');
  END IF;

  IF v_order.side = 'buy' THEN
    UPDATE public.profiles SET balance = balance + (v_order.quantity * v_order.price), updated_at = now() WHERE id = p_user_id;
  ELSIF v_order.side = 'sell' THEN
    INSERT INTO public.holdings (user_id, asset_id, ticker, quantity, avg_buy_price)
    VALUES (p_user_id, v_order.asset_id, v_order.ticker, v_order.quantity, v_order.price)
    ON CONFLICT (user_id, asset_id) DO UPDATE SET
      quantity = holdings.quantity + v_order.quantity, updated_at = now();
  END IF;

  UPDATE public.orders SET status = 'CANCELLED' WHERE id = p_order_id;

  RETURN json_build_object('success', true);
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
  v_existing_id BIGINT;
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
DECLARE
  v_ref_price NUMERIC;
BEGIN
  -- Get the reference price (either previous_price or ipo_price) to compute % change
  SELECT COALESCE(previous_price, ipo_price) INTO v_ref_price 
  FROM public.assets WHERE id = NEW.asset_id;

  IF v_ref_price IS NULL OR v_ref_price = 0 THEN
    v_ref_price := NEW.price;
  END IF;

  UPDATE public.assets
  SET 
    current_price = NEW.price,
    change_24h = ((NEW.price - v_ref_price) / v_ref_price) * 100,
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
-- 8. PROPOSALS & VOTES (Community-driven asset listing)
-- ============================================================

-- Proposals table
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  asset_name TEXT NOT NULL,
  ticker TEXT NOT NULL,
  category TEXT DEFAULT 'Physical',
  description TEXT,
  ipo_price NUMERIC(15,2) NOT NULL,
  total_supply INTEGER NOT NULL DEFAULT 100000,
  votes INTEGER DEFAULT 0,
  votes_needed INTEGER DEFAULT 50,
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'APPROVED', 'REJECTED'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Everyone can read proposals
CREATE POLICY "Proposals are viewable by everyone" ON public.proposals
  FOR SELECT USING (true);

-- Users can insert their own proposals
CREATE POLICY "Users can create proposals" ON public.proposals
  FOR INSERT WITH CHECK (auth.uid() = proposer_id);

-- Allow updates (for vote incrementing via RPC SECURITY DEFINER)
CREATE POLICY "Allow update proposals" ON public.proposals
  FOR UPDATE USING (true);

-- Votes table
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, proposal_id) -- One vote per user per proposal
);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Everyone can read votes
CREATE POLICY "Votes are viewable by everyone" ON public.votes
  FOR SELECT USING (true);

-- Users can insert their own votes
CREATE POLICY "Users can cast votes" ON public.votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- cast_vote RPC: Atomically insert vote + increment count
-- ============================================================
CREATE OR REPLACE FUNCTION public.cast_vote(
  p_user_id UUID,
  p_proposal_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_exists BOOLEAN;
  v_new_votes INTEGER;
  v_votes_needed INTEGER;
  v_proposal RECORD;
BEGIN
  -- Check if already voted
  SELECT EXISTS(
    SELECT 1 FROM public.votes WHERE user_id = p_user_id AND proposal_id = p_proposal_id
  ) INTO v_exists;

  IF v_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already voted');
  END IF;

  -- Insert the vote
  INSERT INTO public.votes (user_id, proposal_id) VALUES (p_user_id, p_proposal_id);

  -- Atomically increment vote count
  UPDATE public.proposals
  SET votes = votes + 1
  WHERE id = p_proposal_id
  RETURNING votes, votes_needed INTO v_new_votes, v_votes_needed;

  -- Auto-approve if threshold reached
  IF v_new_votes >= v_votes_needed THEN
    UPDATE public.proposals SET status = 'APPROVED' WHERE id = p_proposal_id;

    -- Fetch proposal details for auto-listing
    SELECT * INTO v_proposal FROM public.proposals WHERE id = p_proposal_id;

    -- Auto-create the asset
    INSERT INTO public.assets (ticker, name, category, description, ipo_price, total_supply, current_price, status)
    VALUES (
      v_proposal.ticker,
      v_proposal.asset_name,
      v_proposal.category,
      v_proposal.description,
      v_proposal.ipo_price,
      v_proposal.total_supply,
      v_proposal.ipo_price,  -- initial price = IPO price
      'IPO'
    )
    ON CONFLICT (ticker) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'votes', v_new_votes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- AUTOMATED RISK MANAGEMENT ENGINE: Stop Loss & Take Profit
-- ============================================================

-- This function fires AFTER a trade is inserted.
-- It checks if the trade price triggers any pending Stop Loss or Take Profit orders.
CREATE OR REPLACE FUNCTION public.check_stop_losses()
RETURNS TRIGGER AS $$
DECLARE
  v_order RECORD;
  v_holding_qty NUMERIC;
  v_fill_qty NUMERIC;
  v_fill_total NUMERIC;
BEGIN
  -- 1. Check STOP LOSS (Trigger when market price drops TO or BELOW stop price)
  FOR v_order IN
    SELECT * FROM public.orders
    WHERE asset_id = NEW.asset_id
      AND order_type = 'Stop Loss'
      AND status = 'PENDING'
      AND side = 'sell'
      AND price >= NEW.price
    ORDER BY price DESC
    FOR UPDATE
  LOOP
    SELECT COALESCE(quantity, 0) INTO v_holding_qty FROM public.holdings WHERE user_id = v_order.user_id AND asset_id = v_order.asset_id FOR UPDATE;
    IF v_holding_qty IS NULL OR v_holding_qty <= 0 THEN
      UPDATE public.orders SET status = 'CANCELLED' WHERE id = v_order.id;
      CONTINUE;
    END IF;

    v_fill_qty := LEAST(v_order.quantity, v_holding_qty);
    v_fill_total := v_fill_qty * NEW.price;

    UPDATE public.holdings SET quantity = quantity - v_fill_qty, updated_at = now() WHERE user_id = v_order.user_id AND asset_id = v_order.asset_id;
    DELETE FROM public.holdings WHERE user_id = v_order.user_id AND asset_id = v_order.asset_id AND quantity <= 0;

    UPDATE public.profiles SET balance = balance + v_fill_total, total_trades = total_trades + 1, updated_at = now() WHERE id = v_order.user_id;

    INSERT INTO public.trades (user_id, asset_id, ticker, side, quantity, price, total) VALUES (v_order.user_id, v_order.asset_id, v_order.ticker, 'sell', v_fill_qty, NEW.price, v_fill_total);
    UPDATE public.orders SET status = 'FILLED', filled_at = now() WHERE id = v_order.id;
    INSERT INTO public.notifications (user_id, title, message, type) VALUES (v_order.user_id, 'Stop Loss Triggered', 'Your stop loss on ' || v_order.ticker || ' triggered at ₮' || ROUND(NEW.price, 2) || '. Sold ' || v_fill_qty || ' shares.', 'alert');
  END LOOP;

  -- 2. Check TAKE PROFIT (Trigger when market price rises TO or ABOVE target price)
  FOR v_order IN
    SELECT * FROM public.orders
    WHERE asset_id = NEW.asset_id
      AND order_type = 'Take Profit'
      AND status = 'PENDING'
      AND side = 'sell'
      AND price <= NEW.price
    ORDER BY price ASC
    FOR UPDATE
  LOOP
    SELECT COALESCE(quantity, 0) INTO v_holding_qty FROM public.holdings WHERE user_id = v_order.user_id AND asset_id = v_order.asset_id FOR UPDATE;
    IF v_holding_qty IS NULL OR v_holding_qty <= 0 THEN
      UPDATE public.orders SET status = 'CANCELLED' WHERE id = v_order.id;
      CONTINUE;
    END IF;

    v_fill_qty := LEAST(v_order.quantity, v_holding_qty);
    v_fill_total := v_fill_qty * NEW.price;

    UPDATE public.holdings SET quantity = quantity - v_fill_qty, updated_at = now() WHERE user_id = v_order.user_id AND asset_id = v_order.asset_id;
    DELETE FROM public.holdings WHERE user_id = v_order.user_id AND asset_id = v_order.asset_id AND quantity <= 0;

    UPDATE public.profiles SET balance = balance + v_fill_total, total_trades = total_trades + 1, updated_at = now() WHERE id = v_order.user_id;

    INSERT INTO public.trades (user_id, asset_id, ticker, side, quantity, price, total) VALUES (v_order.user_id, v_order.asset_id, v_order.ticker, 'sell', v_fill_qty, NEW.price, v_fill_total);
    UPDATE public.orders SET status = 'FILLED', filled_at = now() WHERE id = v_order.id;
    INSERT INTO public.notifications (user_id, title, message, type) VALUES (v_order.user_id, 'Take Profit Triggered', 'Your take profit on ' || v_order.ticker || ' triggered at ₮' || ROUND(NEW.price, 2) || '. Sold ' || v_fill_qty || ' shares.', 'success');
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fire AFTER each trade is inserted
DROP TRIGGER IF EXISTS on_trade_check_stop_losses ON public.trades;
CREATE TRIGGER on_trade_check_stop_losses
  AFTER INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.check_stop_losses();


-- ============================================================
-- DONE! Your TraX database is ready.
-- ============================================================
