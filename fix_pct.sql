-- Run this in your Supabase SQL Editor to fix the 24h Change Percentage logic

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
