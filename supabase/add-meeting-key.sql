-- Run this in Supabase -> SQL Editor -> New query -> Run
-- Adds the meeting_key column to tasks for linking tasks to calendar meetings

ALTER TABLE tasks ADD COLUMN meeting_key text NOT NULL DEFAULT '';
CREATE INDEX idx_tasks_meeting_key ON tasks(user_id, meeting_key);
