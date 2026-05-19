-- Add per-fee date and probability columns to opportunities.
-- Each fee line gets its own expected date and probability,
-- separate from the overall opportunity probability.
-- Run in Supabase SQL Editor.

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS strategy_fee_close date,
  ADD COLUMN IF NOT EXISTS strategy_fee_prob  integer,
  ADD COLUMN IF NOT EXISTS setup_fee_close    date,
  ADD COLUMN IF NOT EXISTS setup_fee_prob     integer,
  ADD COLUMN IF NOT EXISTS monthly_fee_start  date,
  ADD COLUMN IF NOT EXISTS monthly_fee_prob   integer;
