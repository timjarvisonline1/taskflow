-- ═══════════ ENHANCE INSTANTLY: CAMPAIGN DETAIL + STEPS ═══════════
-- Adds sequence/schedule data to campaigns and step-level analytics table

-- ═══════════ 1. ADD DETAIL FIELDS TO CAMPAIGNS ═══════════

ALTER TABLE instantly_campaigns ADD COLUMN IF NOT EXISTS sequences jsonb DEFAULT '[]'::jsonb;
ALTER TABLE instantly_campaigns ADD COLUMN IF NOT EXISTS campaign_schedule jsonb DEFAULT '{}'::jsonb;
ALTER TABLE instantly_campaigns ADD COLUMN IF NOT EXISTS email_list jsonb DEFAULT '[]'::jsonb;
ALTER TABLE instantly_campaigns ADD COLUMN IF NOT EXISTS daily_limit int NOT NULL DEFAULT 0;
ALTER TABLE instantly_campaigns ADD COLUMN IF NOT EXISTS stop_on_reply boolean NOT NULL DEFAULT true;

-- ═══════════ 2. NEW TABLE: CAMPAIGN STEP ANALYTICS ═══════════

CREATE TABLE IF NOT EXISTS instantly_campaign_steps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id     uuid NOT NULL REFERENCES instantly_campaigns(id) ON DELETE CASCADE,
  step            int NOT NULL DEFAULT 0,
  variant         text NOT NULL DEFAULT 'A',
  sent            int NOT NULL DEFAULT 0,
  opened          int NOT NULL DEFAULT 0,
  unique_opened   int NOT NULL DEFAULT 0,
  replies         int NOT NULL DEFAULT 0,
  unique_replies  int NOT NULL DEFAULT 0,
  clicks          int NOT NULL DEFAULT 0,
  unique_clicks   int NOT NULL DEFAULT 0,
  opportunities   int NOT NULL DEFAULT 0,
  synced_at       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign_id, step, variant)
);

ALTER TABLE instantly_campaign_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own instantly_campaign_steps" ON instantly_campaign_steps
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ics_user ON instantly_campaign_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_ics_campaign ON instantly_campaign_steps(user_id, campaign_id);
