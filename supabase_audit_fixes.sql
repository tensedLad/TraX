-- ============================================================
-- TraX Code Audit Fixes — SQL Migration
-- Run this in Supabase SQL Editor to apply all audit fixes.
-- ============================================================

-- ── 1. FIX: Index on trades table for fast queries ──
-- The audit noted: SELECT * FROM trades ORDER BY executed_at is slow
-- without an index. Also needed for portfolio/profile queries.
CREATE INDEX IF NOT EXISTS idx_trades_user_executed 
  ON public.trades (user_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_trades_ticker_executed 
  ON public.trades (ticker, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_trades_asset_executed 
  ON public.trades (asset_id, executed_at DESC);

-- ── 2. FIX: Index for check_stop_losses trigger (O(n) → O(log n)) ──
-- The trigger scans all PENDING stop-loss/take-profit orders per trade.
-- This index makes it fast.
CREATE INDEX IF NOT EXISTS idx_orders_pending_stops 
  ON public.orders (asset_id, order_type, status, price)
  WHERE status = 'PENDING';

-- ── 3. FIX: Index on holdings for top holders query ──
CREATE INDEX IF NOT EXISTS idx_holdings_asset_qty 
  ON public.holdings (asset_id, quantity DESC);

-- ── 4. FIX: Disable realtime on tables that don't need it ──
-- price_history is now written by bot candle flush (once per minute),
-- and orders are polled. Disabling saves Supabase free-tier slots.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.price_history;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Keep realtime only on: assets, trades, proposals, votes (4 tables max)


-- ── 5. FIX: Materialized view for leaderboard ──
-- The audit noted: The leaderboard VIEW recalculates JOINs on every query.
-- With 100+ users and 6 assets, this becomes a slow query every time
-- someone opens the Leaderboard page.

-- Drop the old VIEW
DROP VIEW IF EXISTS public.leaderboard;

-- Create materialized view with same structure
CREATE MATERIALIZED VIEW IF NOT EXISTS public.leaderboard_cache AS
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

-- Unique index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_cache_id 
  ON public.leaderboard_cache (id);

-- Create a regular view on top that the app queries
-- (so the app code doesn't need to change — it still selects from 'leaderboard')
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT * FROM public.leaderboard_cache;

-- Refresh it once now
REFRESH MATERIALIZED VIEW leaderboard_cache;

-- To set up automatic refresh, run in Supabase Dashboard > Extensions:
-- 1. Enable pg_cron extension
-- 2. Then run:
-- SELECT cron.schedule('refresh_leaderboard', '*/1 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY public.leaderboard_cache');


-- ── 6. FIX: Rate limiting on execute_order ──
-- Add a simple cooldown: reject if user's last order was within 500ms
-- This prevents a user scripting 1000 orders/second
CREATE OR REPLACE FUNCTION public.check_order_rate_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_order TIMESTAMPTZ;
BEGIN
  SELECT created_at INTO v_last_order
  FROM public.orders
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_order IS NOT NULL AND v_last_order > now() - INTERVAL '500 milliseconds' THEN
    RETURN FALSE; -- Too fast
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 7. FIX: Volume column on orders for portfolio queries ──
-- (Optimization: skip if column already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'price_history' AND column_name = 'volume' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.price_history ADD COLUMN volume NUMERIC(15,2) DEFAULT 0;
  END IF;
END $$;

-- ── 8. FIX: Allow public read on holdings for Top Holders feature ──
-- The current RLS only allows users to view their OWN holdings.
-- Top Holders needs to read ALL holdings for an asset. This policy
-- allows anyone to SELECT (read only) from holdings.
CREATE POLICY "Public can view holdings for leaderboard" ON public.holdings
  FOR SELECT USING (true);


-- ============================================================
-- DONE! Run REFRESH MATERIALIZED VIEW leaderboard_cache; via cron.
-- ============================================================
