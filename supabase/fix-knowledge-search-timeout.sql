-- Fix: Optimize match_knowledge() to avoid statement timeout on large datasets
-- Problem: Previous version computed recency + keyword boost on ALL 50K+ rows
-- Solution: Two-phase approach — HNSW index scan first, then boost small candidate set

CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count int DEFAULT 10,
  match_threshold float DEFAULT 0.3,
  filter_source_type text DEFAULT NULL,
  filter_client_id uuid DEFAULT NULL,
  search_keywords text DEFAULT NULL
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
DECLARE
  recency_weight float := 0.05;
  recency_half_life float := 90.0;
  keyword_boost float := 0.08;
BEGIN
  RETURN QUERY
  WITH candidates AS (
    -- Phase 1: Fast HNSW index scan — ORDER BY <=> LIMIT is the index-friendly pattern
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
      kc.content_tsv,
      (1 - (kc.embedding <=> query_embedding))::float AS vec_sim
    FROM knowledge_chunks kc
    WHERE kc.user_id = match_user_id
      AND kc.embedding IS NOT NULL
      AND (filter_source_type IS NULL OR kc.source_type = filter_source_type)
      AND (filter_client_id IS NULL OR kc.client_id = filter_client_id)
    ORDER BY kc.embedding <=> query_embedding
    LIMIT match_count * 4
  )
  -- Phase 2: Apply recency + keyword boosts to small candidate set only (~40-80 rows, not 50K)
  SELECT
    c.id,
    c.source_type,
    c.source_id,
    c.title,
    c.content,
    c.client_id,
    c.date,
    c.people,
    c.tags,
    (
      c.vec_sim
      + CASE
          WHEN c.date IS NOT NULL THEN
            recency_weight * EXP(
              -0.693 * EXTRACT(EPOCH FROM (now() - c.date)) / (recency_half_life * 86400)
            )
          ELSE 0
        END
      + CASE
          WHEN search_keywords IS NOT NULL
            AND c.content_tsv IS NOT NULL
            AND c.content_tsv @@ plainto_tsquery('english', search_keywords)
          THEN keyword_boost
          ELSE 0
        END
    )::float AS similarity
  FROM candidates c
  WHERE c.vec_sim > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Add composite index for user_id + client_id queries (was missing — only had client_id alone)
CREATE INDEX IF NOT EXISTS idx_kc_user_client ON knowledge_chunks(user_id, client_id);
