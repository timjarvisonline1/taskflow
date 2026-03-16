-- Add participants JSONB column to gmail_threads for Gmail-style participant display
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS participants jsonb DEFAULT '[]';
