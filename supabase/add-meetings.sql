-- Read.ai Meetings
CREATE TABLE meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Read.ai identifiers
  session_id text NOT NULL DEFAULT '',

  -- Core meeting data
  title text NOT NULL DEFAULT '',
  start_time timestamptz,
  end_time timestamptz,
  duration_minutes integer NOT NULL DEFAULT 0,

  -- Participants
  participants jsonb NOT NULL DEFAULT '[]',
  owner_name text NOT NULL DEFAULT '',
  owner_email text NOT NULL DEFAULT '',

  -- AI-generated content (plain text for RAG chunking)
  summary text NOT NULL DEFAULT '',
  transcript text NOT NULL DEFAULT '',

  -- Structured data
  action_items jsonb NOT NULL DEFAULT '[]',
  key_questions jsonb NOT NULL DEFAULT '[]',
  topics jsonb NOT NULL DEFAULT '[]',
  chapter_summaries jsonb NOT NULL DEFAULT '[]',

  -- External links
  report_url text NOT NULL DEFAULT '',

  -- Video (future use)
  video_storage_path text NOT NULL DEFAULT '',
  video_size_bytes bigint NOT NULL DEFAULT 0,

  -- CRM associations (matches gmail_threads pattern)
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  end_client text NOT NULL DEFAULT '',
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,

  -- Metadata
  source text NOT NULL DEFAULT 'readai',
  raw_payload jsonb NOT NULL DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Deduplication: one meeting per session per user
CREATE UNIQUE INDEX idx_meetings_user_session ON meetings(user_id, session_id);

-- Standard indexes
CREATE INDEX idx_meetings_user ON meetings(user_id);
CREATE INDEX idx_meetings_user_start ON meetings(user_id, start_time DESC);
CREATE INDEX idx_meetings_client ON meetings(client_id);

-- RLS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own meetings" ON meetings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
