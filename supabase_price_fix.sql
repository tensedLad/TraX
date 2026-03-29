-- ============================================================
-- TraX Trading Math Fix — Price Discovery Engine
-- Run this in Supabase SQL Editor.
-- 
-- FIX: When a trade executes, the asset's current_price should
-- update to the LAST TRADE PRICE (price discovery). Also updates
-- volume_24h, high_24h, low_24h, and change_24h from real data.
-- ============================================================


-- ── 1. Trigger: Update asset price on every trade ──
-- This is the CORE price discovery mechanism. Every time a trade
-- is recorded, it sets current_price = trade price (last sale price).
-- This is how all real exchanges work.

CREATE OR REPLACE FUNCTION public.update_asset_on_trade()
RETURNS TRIGGER AS $$
DECLARE
  v_prev_price NUMERIC;
  v_volume_24h NUMERIC;
  v_high_24h NUMERIC;
  v_low_24h NUMERIC;
  v_price_24h_ago NUMERIC;
BEGIN
  -- Get the current price before this trade
  SELECT current_price INTO v_prev_price
  FROM public.assets WHERE id = NEW.asset_id;

  -- Calculate 24h rolling stats from trades table
  SELECT
    COALESCE(SUM(total), 0),
    COALESCE(MAX(price), NEW.price),
    COALESCE(MIN(price), NEW.price)
  INTO v_volume_24h, v_high_24h, v_low_24h
  FROM public.trades
  WHERE asset_id = NEW.asset_id
    AND executed_at > now() - INTERVAL '24 hours';

  -- Get the price from ~24h ago for change calculation
  SELECT price INTO v_price_24h_ago
  FROM public.trades
  WHERE asset_id = NEW.asset_id
    AND executed_at <= now() - INTERVAL '24 hours'
  ORDER BY executed_at DESC
  LIMIT 1;

  -- If no 24h-ago trade, fall back to ipo_price
  IF v_price_24h_ago IS NULL THEN
    SELECT ipo_price INTO v_price_24h_ago
    FROM public.assets WHERE id = NEW.asset_id;
  END IF;

  -- Update the asset with real market data
  UPDATE public.assets SET
    previous_price = v_prev_price,
    current_price = NEW.price,
    volume_24h = v_volume_24h,
    high_24h = v_high_24h,
    low_24h = v_low_24h,
    change_24h = CASE
      WHEN v_price_24h_ago > 0 THEN
        ROUND(((NEW.price - v_price_24h_ago) / v_price_24h_ago) * 100, 4)
      ELSE 0
    END,
    updated_at = now()
  WHERE id = NEW.asset_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Drop old trigger if it exists, then create
DROP TRIGGER IF EXISTS on_trade_update_asset ON public.trades;
CREATE TRIGGER on_trade_update_asset
  AFTER INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.update_asset_on_trade();


-- ============================================================
-- DONE! Now when any trade executes:
--   1. current_price = last trade price (real price discovery)
--   2. change_24h = real % change vs 24h ago
--   3. volume_24h = rolling 24h trade volume
--   4. high_24h / low_24h = rolling 24h range
-- ============================================================
