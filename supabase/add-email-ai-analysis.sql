-- Email AI Analysis Migration
-- Adds Claude-powered email triage columns to gmail_threads

-- AI analysis results
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS needs_reply boolean;
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS ai_summary text NOT NULL DEFAULT '';
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS ai_urgency text NOT NULL DEFAULT '';
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS ai_category text NOT NULL DEFAULT '';

-- Triage status tracking
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS reply_status text NOT NULL DEFAULT 'pending';
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS snoozed_until timestamptz;
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz;

-- Index for action required queries
CREATE INDEX IF NOT EXISTS idx_gmail_threads_action_required
  ON gmail_threads (user_id, needs_reply, reply_status)
  WHERE needs_reply = true;
