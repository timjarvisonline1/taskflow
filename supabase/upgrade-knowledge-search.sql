-- ═══════════════════════════════════════════════════════════════
-- TaskFlow Knowledge Base: Search Improvements
-- ═══════════════════════════════════════════════════════════════
-- RUN THESE 3 PARTS SEPARATELY in Supabase SQL Editor:
--   Part 1: Add column + trigger (run first)
--   Part 2: Backfill existing rows (may take a moment)
--   Part 3: Upgrade match_knowledge function (run last)
-- ═══════════════════════════════════════════════════════════════


-- ═══════════ PART 1: Column, Index, Trigger ═══════════
-- (copy from here to "END PART 1" and run)

-- Add tsvector column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'knowledge_chunks' AND column_name = 'content_tsv'
  ) THEN
    ALTER TABLE knowledge_chunks ADD COLUMN content_tsv tsvector;
  END IF;
END $$;

-- GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_kc_tsv ON knowledge_chunks USING gin(content_tsv);

-- Trigger to auto-populate on insert/update
CREATE OR REPLACE FUNCTION knowledge_chunks_tsv_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.content_tsv := to_tsvector('english', coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kc_tsv ON knowledge_chunks;
CREATE TRIGGER trg_kc_tsv
  BEFORE INSERT OR UPDATE OF title, content ON knowledge_chunks
  FOR EACH ROW EXECUTE FUNCTION knowledge_chunks_tsv_trigger();

-- END PART 1


-- ═══════════ PART 2: Backfill existing rows ═══════════
-- (copy from here to "END PART 2" and run)
-- Processes in batches of 500 to avoid timeout

DO $$
DECLARE
  batch_size int := 500;
  rows_updated int := 1;
BEGIN
  WHILE rows_updated > 0 LOOP
    WITH batch AS (
      SELECT id FROM knowledge_chunks
      WHERE content_tsv IS NULL
      LIMIT batch_size
    )
    UPDATE knowledge_chunks kc
    SET content_tsv = to_tsvector('english', coalesce(kc.title, '') || ' ' || coalesce(kc.content, ''))
    FROM batch
    WHERE kc.id = batch.id;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % rows', rows_updated;
  END LOOP;
END $$;

-- END PART 2


-- ═══════════ PART 3: Upgraded match_knowledge function ═══════════
-- (copy from here to "END PART 3" and run)

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
    (
      (1 - (kc.embedding <=> query_embedding))
      + CASE
          WHEN kc.date IS NOT NULL THEN
            recency_weight * EXP(
              -0.693 * EXTRACT(EPOCH FROM (now() - kc.date)) / (recency_half_life * 86400)
            )
          ELSE 0
        END
      + CASE
          WHEN search_keywords IS NOT NULL
            AND kc.content_tsv IS NOT NULL
            AND kc.content_tsv @@ plainto_tsquery('english', search_keywords)
          THEN keyword_boost
          ELSE 0
        END
    )::float AS similarity
  FROM knowledge_chunks kc
  WHERE kc.user_id = match_user_id
    AND kc.embedding IS NOT NULL
    AND (filter_source_type IS NULL OR kc.source_type = filter_source_type)
    AND (filter_client_id IS NULL OR kc.client_id = filter_client_id)
    AND (1 - (kc.embedding <=> query_embedding)) > match_threshold
  ORDER BY (
    (1 - (kc.embedding <=> query_embedding))
    + CASE
        WHEN kc.date IS NOT NULL THEN
          recency_weight * EXP(
            -0.693 * EXTRACT(EPOCH FROM (now() - kc.date)) / (recency_half_life * 86400)
          )
        ELSE 0
      END
    + CASE
        WHEN search_keywords IS NOT NULL
          AND kc.content_tsv IS NOT NULL
          AND kc.content_tsv @@ plainto_tsquery('english', search_keywords)
        THEN keyword_boost
        ELSE 0
      END
  ) DESC
  LIMIT match_count;
END;
$$;

-- END PART 3
