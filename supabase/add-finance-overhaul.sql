-- Finance Section Overhaul Migration
-- Run in Supabase SQL Editor

-- 1. Team member commission enhancements
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS commission_frequency text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS commission_cap numeric;

-- 2. Scheduled item end date / payment count
ALTER TABLE scheduled_items
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS num_payments integer;

-- 3. Opportunity payment method + processing fees + monthly duration
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'bank_transfer',
  ADD COLUMN IF NOT EXISTS processing_fee_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS receiving_account text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expected_monthly_duration integer DEFAULT 12;
