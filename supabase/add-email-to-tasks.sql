-- Add email_thread_id column to tasks and done tables for linking emails to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS email_thread_id text NOT NULL DEFAULT '';
ALTER TABLE done ADD COLUMN IF NOT EXISTS email_thread_id text NOT NULL DEFAULT '';
