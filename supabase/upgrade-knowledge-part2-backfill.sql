-- Part 2: Backfill existing rows
-- With 112k rows, we need larger batches. The tsvector only indexes
-- the first ~1MB of text per row, so this should be fast per-row.
-- Run this REPEATEDLY until it reports 0 rows affected.
-- Each run processes up to 5000 rows.

UPDATE knowledge_chunks
SET content_tsv = to_tsvector('english',
  left(coalesce(title, ''), 500) || ' ' || left(coalesce(content, ''), 5000)
)
WHERE id IN (
  SELECT id FROM knowledge_chunks
  WHERE content_tsv IS NULL
  LIMIT 5000
);
