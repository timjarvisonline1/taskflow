-- Enhanced Email AI Analysis columns
-- Adds sentiment, meeting detection, follow-up detection, CRM suggestion, summarization cache, task suggestion

-- Sentiment analysis
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS ai_sentiment text NOT NULL DEFAULT '';

-- Meeting detection
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS has_meeting boolean NOT NULL DEFAULT false;
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS meeting_details text NOT NULL DEFAULT '';

-- Follow-up detection
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS needs_followup boolean NOT NULL DEFAULT false;
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS followup_details text NOT NULL DEFAULT '';

-- Smart CRM association — AI-inferred client name
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS ai_client_name text NOT NULL DEFAULT '';

-- Thread summarization cache
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS full_summary text NOT NULL DEFAULT '';
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS full_summary_at timestamptz;

-- Task suggestion — JSON string of {item, notes, importance, category, est}
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS ai_suggested_task text NOT NULL DEFAULT '';

-- Index for follow-up queries
CREATE INDEX IF NOT EXISTS idx_gmail_threads_followup
  ON gmail_threads (user_id, needs_followup) WHERE needs_followup = true;
