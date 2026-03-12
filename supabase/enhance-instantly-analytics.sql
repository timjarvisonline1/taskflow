-- ═══════════ ENHANCE INSTANTLY: RICH ANALYTICS ═══════════
-- Adds daily analytics time-series table and pipeline fields to campaigns

-- ═══════════ 1. NEW TABLE: DAILY ANALYTICS ═══════════

CREATE TABLE IF NOT EXISTS instantly_analytics_daily (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id     uuid NOT NULL REFERENCES instantly_campaigns(id) ON DELETE CASCADE,
  date            date NOT NULL,
  sent            int NOT NULL DEFAULT 0,
  contacted       int NOT NULL DEFAULT 0,
  new_leads_contacted int NOT NULL DEFAULT 0,
  opened          int NOT NULL DEFAULT 0,
  unique_opened   int NOT NULL DEFAULT 0,
  replies         int NOT NULL DEFAULT 0,
  unique_replies  int NOT NULL DEFAULT 0,
  clicks          int NOT NULL DEFAULT 0,
  unique_clicks   int NOT NULL DEFAULT 0,
  bounced         int NOT NULL DEFAULT 0,
  opportunities   int NOT NULL DEFAULT 0,
  synced_at       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign_id, date)
);

ALTER TABLE instantly_analytics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own instantly_analytics_daily" ON instantly_analytics_daily
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_iad_user ON instantly_analytics_daily(user_id);
CREATE INDEX IF NOT EXISTS idx_iad_campaign ON instantly_analytics_daily(user_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_iad_date ON instantly_analytics_daily(user_id, date DESC);

-- ═══════════ 2. ADD PIPELINE FIELDS TO CAMPAIGNS ═══════════

ALTER TABLE instantly_campaigns ADD COLUMN IF NOT EXISTS open_count int NOT NULL DEFAULT 0;
ALTER TABLE instantly_campaigns ADD COLUMN IF NOT EXISTS click_count int NOT NULL DEFAULT 0;
ALTER TABLE instantly_campaigns ADD COLUMN IF NOT EXISTS unsubscribed_count int NOT NULL DEFAULT 0;
ALTER TABLE instantly_campaigns ADD COLUMN IF NOT EXISTS completed_count int NOT NULL DEFAULT 0;
ALTER TABLE instantly_campaigns ADD COLUMN IF NOT EXISTS total_opportunities int NOT NULL DEFAULT 0;
ALTER TABLE instantly_campaigns ADD COLUMN IF NOT EXISTS total_opportunity_value float NOT NULL DEFAULT 0;
ALTER TABLE instantly_campaigns ADD COLUMN IF NOT EXISTS total_interested int NOT NULL DEFAULT 0;
ALTER TABLE instantly_campaigns ADD COLUMN IF NOT EXISTS total_meeting_booked int NOT NULL DEFAULT 0;
ALTER TABLE instantly_campaigns ADD COLUMN IF NOT EXISTS total_meeting_completed int NOT NULL DEFAULT 0;
ALTER TABLE instantly_campaigns ADD COLUMN IF NOT EXISTS total_closed int NOT NULL DEFAULT 0;
