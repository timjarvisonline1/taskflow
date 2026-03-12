-- ═══════════ ENHANCE INSTANTLY ACCOUNTS: WARMUP ANALYTICS ═══════════

CREATE TABLE IF NOT EXISTS instantly_warmup_daily (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      uuid NOT NULL REFERENCES instantly_accounts(id) ON DELETE CASCADE,
  date            date NOT NULL,
  sent            int NOT NULL DEFAULT 0,
  landed_inbox    int NOT NULL DEFAULT 0,
  landed_spam     int NOT NULL DEFAULT 0,
  received        int NOT NULL DEFAULT 0,
  health_score    numeric(5,2) NOT NULL DEFAULT 0,
  synced_at       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, account_id, date)
);

ALTER TABLE instantly_warmup_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own instantly_warmup_daily" ON instantly_warmup_daily
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_iwd_user ON instantly_warmup_daily(user_id);
CREATE INDEX IF NOT EXISTS idx_iwd_account ON instantly_warmup_daily(user_id, account_id);
