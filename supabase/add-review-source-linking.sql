-- Add source linking columns to review table
-- meeting_id links to the meeting that generated this review item
-- thread_id links to the gmail thread that generated this review item
ALTER TABLE review ADD COLUMN IF NOT EXISTS meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL;
ALTER TABLE review ADD COLUMN IF NOT EXISTS thread_id text;

-- Track which gmail threads have been analyzed for tasks
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS ai_tasks_generated boolean NOT NULL DEFAULT false;
