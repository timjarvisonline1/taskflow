-- Add AI task generation flag to meetings table
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ai_tasks_generated boolean NOT NULL DEFAULT false;
