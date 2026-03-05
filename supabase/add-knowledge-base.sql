-- ═══════════════════════════════════════════════════════════════
-- TaskFlow Knowledge Base: pgvector + content chunks + search
-- ═══════════════════════════════════════════════════════════════
-- Prerequisites: Enable pgvector extension in Supabase Dashboard
--   Dashboard > Database > Extensions > search "vector" > Enable
-- Then run this migration.
-- ═══════════════════════════════════════════════════════════════

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Content chunks with vector embeddings ───────────────────
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Source tracking
  source_type text NOT NULL,       -- meeting, email, webpage, youtube, document
  source_id text NOT NULL,         -- meeting.id, gmail thread_id, URL, video_id, etc.
  chunk_index integer NOT NULL DEFAULT 0,

  -- Content
  title text NOT NULL DEFAULT '',
  content text NOT NULL,

  -- Metadata for filtering
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  end_client text NOT NULL DEFAULT '',
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  date timestamptz,
  people text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',

  -- Embedding
  embedding vector(1536),
  embedding_model text NOT NULL DEFAULT 'text-embedding-3-small',
  token_count integer NOT NULL DEFAULT 0,

  -- Dedup
  content_hash text NOT NULL DEFAULT '',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kc_user ON knowledge_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_kc_source ON knowledge_chunks(user_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_kc_client ON knowledge_chunks(client_id);
CREATE INDEX IF NOT EXISTS idx_kc_date ON knowledge_chunks(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_kc_hash ON knowledge_chunks(user_id, content_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kc_source_chunk ON knowledge_chunks(user_id, source_type, source_id, chunk_index);

-- RLS
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users CRUD own knowledge_chunks" ON knowledge_chunks;
CREATE POLICY "Users CRUD own knowledge_chunks" ON knowledge_chunks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─── Ingestion tracking per source ───────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  source_type text NOT NULL,       -- meeting, email, webpage, youtube, document
  source_id text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',

  status text NOT NULL DEFAULT 'pending',   -- pending, processing, complete, error
  chunks_count integer NOT NULL DEFAULT 0,
  tokens_used integer NOT NULL DEFAULT 0,
  error_message text NOT NULL DEFAULT '',

  last_ingested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ks_user ON knowledge_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_ks_type ON knowledge_sources(user_id, source_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ks_user_source ON knowledge_sources(user_id, source_type, source_id);

ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users CRUD own knowledge_sources" ON knowledge_sources;
CREATE POLICY "Users CRUD own knowledge_sources" ON knowledge_sources
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─── Vector similarity search function ───────────────────────
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count int DEFAULT 10,
  match_threshold float DEFAULT 0.3,
  filter_source_type text DEFAULT NULL,
  filter_client_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id text,
  title text,
  content text,
  client_id uuid,
  date timestamptz,
  people text[],
  tags text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.source_type,
    kc.source_id,
    kc.title,
    kc.content,
    kc.client_id,
    kc.date,
    kc.people,
    kc.tags,
    (1 - (kc.embedding <=> query_embedding))::float AS similarity
  FROM knowledge_chunks kc
  WHERE kc.user_id = match_user_id
    AND kc.embedding IS NOT NULL
    AND (filter_source_type IS NULL OR kc.source_type = filter_source_type)
    AND (filter_client_id IS NULL OR kc.client_id = filter_client_id)
    AND (1 - (kc.embedding <=> query_embedding)) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
