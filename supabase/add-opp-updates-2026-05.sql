-- Add updates JSONB column to opportunities for activity log
-- Each entry: {"ts": "ISO timestamp", "text": "update text"}
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS updates jsonb NOT NULL DEFAULT '[]'::jsonb;
