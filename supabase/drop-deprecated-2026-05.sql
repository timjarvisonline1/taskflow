-- TaskFlow simplification cull — drop tables and columns that backed removed features
-- Safe to run multiple times (uses IF EXISTS). Run in Supabase SQL Editor.
-- Date: 2026-05-14

BEGIN;

-- ── Outreach / Instantly.ai (full section removed) ──────────────────────────
DROP TABLE IF EXISTS instantly_events           CASCADE;
DROP TABLE IF EXISTS instantly_warmup_daily     CASCADE;
DROP TABLE IF EXISTS instantly_campaign_steps   CASCADE;
DROP TABLE IF EXISTS instantly_analytics_daily  CASCADE;
DROP TABLE IF EXISTS instantly_emails           CASCADE;
DROP TABLE IF EXISTS instantly_leads            CASCADE;
DROP TABLE IF EXISTS instantly_accounts         CASCADE;
DROP TABLE IF EXISTS instantly_campaigns        CASCADE;

-- ── Email UI features removed (Gmail sync stays, search-only UI) ────────────
DROP TABLE IF EXISTS ai_email_drafts            CASCADE;
DROP TABLE IF EXISTS email_rules                CASCADE;
DROP TABLE IF EXISTS scheduled_emails           CASCADE;

-- ── Prospects (managed in Sales now) ────────────────────────────────────────
DROP TABLE IF EXISTS prospects                  CASCADE;
DROP TABLE IF EXISTS prospect_companies         CASCADE;

-- ── Project phases (Initiatives rebuild uses flat structure) ────────────────
DROP TABLE IF EXISTS project_phases             CASCADE;

-- ── gmail_threads: drop columns that backed killed AI email features ────────
-- (Threads themselves stay so Gmail search and the knowledge base still work.)
ALTER TABLE gmail_threads DROP COLUMN IF EXISTS ai_summary;
ALTER TABLE gmail_threads DROP COLUMN IF EXISTS ai_urgency;
ALTER TABLE gmail_threads DROP COLUMN IF EXISTS ai_category;
ALTER TABLE gmail_threads DROP COLUMN IF EXISTS ai_sentiment;
ALTER TABLE gmail_threads DROP COLUMN IF EXISTS reply_status;
ALTER TABLE gmail_threads DROP COLUMN IF EXISTS snoozed_until;
ALTER TABLE gmail_threads DROP COLUMN IF EXISTS ai_analyzed_at;
ALTER TABLE gmail_threads DROP COLUMN IF EXISTS has_meeting;
ALTER TABLE gmail_threads DROP COLUMN IF EXISTS meeting_details;
ALTER TABLE gmail_threads DROP COLUMN IF EXISTS needs_followup;
ALTER TABLE gmail_threads DROP COLUMN IF EXISTS followup_details;
ALTER TABLE gmail_threads DROP COLUMN IF EXISTS ai_client_name;
ALTER TABLE gmail_threads DROP COLUMN IF EXISTS full_summary;
ALTER TABLE gmail_threads DROP COLUMN IF EXISTS full_summary_at;
ALTER TABLE gmail_threads DROP COLUMN IF EXISTS ai_suggested_task;
ALTER TABLE gmail_threads DROP COLUMN IF EXISTS needs_reply;

-- ── Finance: drop team payroll (not used) and Zoho-derived columns ──────────
DROP TABLE IF EXISTS team_members               CASCADE;

-- Optional: drop the kajabi_report column if Tim doesn't generate Kajabi reports.
-- (Leaving it in for now — flip this to enabled if you want it gone.)
-- ALTER TABLE meetings DROP COLUMN IF EXISTS kajabi_report_html;

COMMIT;

-- ── Manual invoices table (used by the new simplified Finance section) ──────
-- Created separately (not part of the drop transaction) so a failure here
-- doesn't roll back the deletions above.
CREATE TABLE IF NOT EXISTS invoices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client       text,
  end_client   text,
  campaign_id  uuid,
  amount       numeric(12,2) NOT NULL DEFAULT 0,
  issued_at    date,
  expected_at  date,
  paid_at      date,
  reference    text,
  notes        text,
  status       text NOT NULL DEFAULT 'open',  -- open | paid | cancelled
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own invoices" ON invoices;
CREATE POLICY "Users manage their own invoices" ON invoices
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_user_expected ON invoices(user_id, expected_at);
