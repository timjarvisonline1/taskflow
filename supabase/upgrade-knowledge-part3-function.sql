-- Part 3: Upgrade match_knowledge with recency weighting + keyword boost

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
