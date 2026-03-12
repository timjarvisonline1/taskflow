-- Instantly.ai integration tables for cold email outreach

-- ═══════════ INSTANTLY CAMPAIGNS ═══════════

CREATE TABLE IF NOT EXISTS instantly_campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instantly_id    text NOT NULL,
  name            text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT '',
  created_at_ext  timestamptz,
  -- Per-campaign config (TaskFlow-side)
  default_opp_type text NOT NULL DEFAULT 'retain_live',
  mapped_client    text NOT NULL DEFAULT '',
  -- Cached analytics from Instantly
  leads_count     int NOT NULL DEFAULT 0,
  contacted_count int NOT NULL DEFAULT 0,
  replies_count   int NOT NULL DEFAULT 0,
  bounced_count   int NOT NULL DEFAULT 0,
  open_rate       float NOT NULL DEFAULT 0,
  reply_rate      float NOT NULL DEFAULT 0,
  -- Metadata
  metadata        jsonb NOT NULL DEFAULT '{}',
  synced_at       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, instantly_id)
);

ALTER TABLE instantly_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own instantly_campaigns" ON instantly_campaigns
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ic_user ON instantly_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_ic_instantly ON instantly_campaigns(user_id, instantly_id);

-- ═══════════ INSTANTLY LEADS ═══════════

CREATE TABLE IF NOT EXISTS instantly_leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instantly_id    text NOT NULL,
  campaign_id     uuid REFERENCES instantly_campaigns(id) ON DELETE SET NULL,
  email           text NOT NULL DEFAULT '',
  first_name      text NOT NULL DEFAULT '',
  last_name       text NOT NULL DEFAULT '',
  company_name    text NOT NULL DEFAULT '',
  phone           text NOT NULL DEFAULT '',
  website         text NOT NULL DEFAULT '',
  title           text NOT NULL DEFAULT '',
  interest_status text NOT NULL DEFAULT '',
  lead_status     text NOT NULL DEFAULT '',
  -- TaskFlow linkage
  prospect_company_id uuid REFERENCES prospect_companies(id) ON DELETE SET NULL,
  prospect_id         uuid REFERENCES prospects(id) ON DELETE SET NULL,
  opportunity_id      uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  -- Metadata
  custom_variables jsonb NOT NULL DEFAULT '{}',
  metadata        jsonb NOT NULL DEFAULT '{}',
  synced_at       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, instantly_id)
);

ALTER TABLE instantly_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own instantly_leads" ON instantly_leads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_il_user ON instantly_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_il_campaign ON instantly_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_il_email ON instantly_leads(user_id, email);
CREATE INDEX IF NOT EXISTS idx_il_interest ON instantly_leads(user_id, interest_status);
CREATE INDEX IF NOT EXISTS idx_il_prospect ON instantly_leads(prospect_company_id);
CREATE INDEX IF NOT EXISTS idx_il_opp ON instantly_leads(opportunity_id);

-- ═══════════ INSTANTLY EMAILS ═══════════

CREATE TABLE IF NOT EXISTS instantly_emails (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instantly_id    text NOT NULL,
  lead_id         uuid REFERENCES instantly_leads(id) ON DELETE SET NULL,
  campaign_id     uuid REFERENCES instantly_campaigns(id) ON DELETE SET NULL,
  from_email      text NOT NULL DEFAULT '',
  from_name       text NOT NULL DEFAULT '',
  to_email        text NOT NULL DEFAULT '',
  subject         text NOT NULL DEFAULT '',
  body            text NOT NULL DEFAULT '',
  body_text       text NOT NULL DEFAULT '',
  timestamp_ext   timestamptz,
  is_reply        boolean NOT NULL DEFAULT false,
  direction       text NOT NULL DEFAULT 'outbound',
  -- AI analysis
  ai_sentiment    text NOT NULL DEFAULT '',
  ai_summary      text NOT NULL DEFAULT '',
  ai_interest     text NOT NULL DEFAULT '',
  ai_suggested_action text NOT NULL DEFAULT '',
  ai_key_info     text NOT NULL DEFAULT '',
  ai_analyzed_at  timestamptz,
  -- Status
  reply_status    text NOT NULL DEFAULT 'pending',
  snoozed_until   timestamptz,
  -- Metadata
  metadata        jsonb NOT NULL DEFAULT '{}',
  synced_at       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, instantly_id)
);

ALTER TABLE instantly_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own instantly_emails" ON instantly_emails
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ie_user ON instantly_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_ie_lead ON instantly_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_ie_campaign ON instantly_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ie_reply ON instantly_emails(user_id, is_reply, direction);
CREATE INDEX IF NOT EXISTS idx_ie_sentiment ON instantly_emails(user_id, ai_sentiment);
CREATE INDEX IF NOT EXISTS idx_ie_status ON instantly_emails(user_id, reply_status);

-- ═══════════ INSTANTLY ACCOUNTS ═══════════

CREATE TABLE IF NOT EXISTS instantly_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instantly_id    text NOT NULL,
  email           text NOT NULL DEFAULT '',
  first_name      text NOT NULL DEFAULT '',
  last_name       text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT '',
  warmup_status   text NOT NULL DEFAULT '',
  daily_limit     int NOT NULL DEFAULT 0,
  -- Cached vitals/analytics
  health_score    int NOT NULL DEFAULT 0,
  sent_today      int NOT NULL DEFAULT 0,
  replies_today   int NOT NULL DEFAULT 0,
  bounced_today   int NOT NULL DEFAULT 0,
  metadata        jsonb NOT NULL DEFAULT '{}',
  synced_at       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, instantly_id)
);

ALTER TABLE instantly_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own instantly_accounts" ON instantly_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ia_user ON instantly_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_ia_email ON instantly_accounts(user_id, email);
