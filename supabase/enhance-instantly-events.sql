-- ═══════════ INSTANTLY EVENTS: REAL-TIME ACTIVITY FEED ═══════════

CREATE TABLE IF NOT EXISTS instantly_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type      text NOT NULL DEFAULT '',
  campaign_id     uuid REFERENCES instantly_campaigns(id) ON DELETE SET NULL,
  lead_email      text NOT NULL DEFAULT '',
  email_account   text NOT NULL DEFAULT '',
  data            jsonb NOT NULL DEFAULT '{}',
  timestamp       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE instantly_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own instantly_events" ON instantly_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_iev_user_ts ON instantly_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_iev_type ON instantly_events(user_id, event_type);
