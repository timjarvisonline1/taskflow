-- Part 1: Add tsvector column, GIN index, and auto-populate trigger

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'knowledge_chunks' AND column_name = 'content_tsv'
  ) THEN
    ALTER TABLE knowledge_chunks ADD COLUMN content_tsv tsvector;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_kc_tsv ON knowledge_chunks USING gin(content_tsv);

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
