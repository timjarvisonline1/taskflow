-- Add billing frequency and next billing date to campaigns
-- Supports monthly, quarterly, annually billing cycles
-- Billing amount = monthly_fee × months_in_cycle
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS billing_frequency text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS next_billing_date date;
