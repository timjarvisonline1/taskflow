-- AI Email Drafts table
-- Stores AI-generated draft replies for emails flagged as needing a response.
-- These are ONLY drafts — nothing is ever sent automatically.

CREATE TABLE IF NOT EXISTS ai_email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  message_id TEXT,
  subject TEXT,
  to_addresses TEXT,
  cc_addresses TEXT,
  body_html TEXT,
  body_text TEXT,
  original_snippet TEXT,
  original_from TEXT,
  original_date TIMESTAMPTZ,
  kb_chunks_used INT DEFAULT 0,
  kb_sources TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  end_client TEXT,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'edited', 'sent', 'discarded')),
  batch_run_id TEXT,
  ai_model TEXT,
  custom_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  discarded_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE ai_email_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ai_email_drafts"
  ON ai_email_drafts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_email_drafts_user_status ON ai_email_drafts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_email_drafts_user_thread ON ai_email_drafts(user_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_ai_email_drafts_user_created ON ai_email_drafts(user_id, created_at DESC);

-- Unique partial index: only one pending draft per thread per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_email_drafts_unique_pending
  ON ai_email_drafts(user_id, thread_id)
  WHERE status = 'pending';
