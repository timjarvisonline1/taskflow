-- Add AI CRM suggestions column to meetings table
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ai_suggestions jsonb NOT NULL DEFAULT '[]';
