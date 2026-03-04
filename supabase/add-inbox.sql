-- Run this in Supabase -> SQL Editor -> New query -> Run
-- Adds the is_inbox column to tasks for quick-add capture workflow

ALTER TABLE tasks ADD COLUMN is_inbox boolean NOT NULL DEFAULT false;
CREATE INDEX idx_tasks_inbox ON tasks(user_id, is_inbox);
