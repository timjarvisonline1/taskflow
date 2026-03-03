-- Opportunity Types Enhancement
-- Adds type, payment_plan, monthly_ad_spend columns to opportunities
-- Creates opportunity_meetings table
-- Remaps existing stage names for fc_partnership type

-- 1. Add type column (existing opportunities default to fc_partnership)
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'fc_partnership';

-- 2. Add payment_plan for Retain Live (one_time / 3_monthly / custom)
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS payment_plan text NOT NULL DEFAULT '';

-- 3. Add monthly_ad_spend (F&C types)
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS monthly_ad_spend numeric NOT NULL DEFAULT 0;

-- 4. Remap existing stages to new F&C Partnership stage names
UPDATE opportunities SET stage = 'Contact Identified' WHERE stage = 'Lead';
UPDATE opportunities SET stage = 'Discovery Call' WHERE stage = 'Discovery';
UPDATE opportunities SET stage = 'Proactive Pitch' WHERE stage = 'Proposal';
-- 'Video Tracking', 'Negotiation', 'Closed Won', 'Closed Lost' remain unchanged

-- 5. Create opportunity_meetings table
CREATE TABLE IF NOT EXISTS opportunity_meetings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id   uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  date             timestamptz NOT NULL DEFAULT now(),
  title            text NOT NULL DEFAULT '',
  recording_link   text NOT NULL DEFAULT '',
  notes            text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE opportunity_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own opportunity meetings"
  ON opportunity_meetings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_opp_meetings_user ON opportunity_meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_opp_meetings_opp ON opportunity_meetings(opportunity_id);
