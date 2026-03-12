-- ═══════════ ENHANCE INSTANTLY LEADS: ENGAGEMENT METRICS + RICH FIELDS ═══════════

-- ═══════════ 1. ADD ENGAGEMENT COLUMNS ═══════════

ALTER TABLE instantly_leads ADD COLUMN IF NOT EXISTS email_open_count int NOT NULL DEFAULT 0;
ALTER TABLE instantly_leads ADD COLUMN IF NOT EXISTS email_reply_count int NOT NULL DEFAULT 0;
ALTER TABLE instantly_leads ADD COLUMN IF NOT EXISTS email_click_count int NOT NULL DEFAULT 0;
ALTER TABLE instantly_leads ADD COLUMN IF NOT EXISTS timestamp_last_open timestamptz;
ALTER TABLE instantly_leads ADD COLUMN IF NOT EXISTS timestamp_last_reply timestamptz;
ALTER TABLE instantly_leads ADD COLUMN IF NOT EXISTS timestamp_last_click timestamptz;
ALTER TABLE instantly_leads ADD COLUMN IF NOT EXISTS timestamp_last_interest_change timestamptz;
ALTER TABLE instantly_leads ADD COLUMN IF NOT EXISTS lead_score text NOT NULL DEFAULT '';
ALTER TABLE instantly_leads ADD COLUMN IF NOT EXISTS is_website_visitor boolean NOT NULL DEFAULT false;
ALTER TABLE instantly_leads ADD COLUMN IF NOT EXISTS last_step_id text NOT NULL DEFAULT '';
ALTER TABLE instantly_leads ADD COLUMN IF NOT EXISTS last_step_from text NOT NULL DEFAULT '';
ALTER TABLE instantly_leads ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT '';
