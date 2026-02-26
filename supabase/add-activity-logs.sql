-- Run this in Supabase → SQL Editor → New query → Run
-- Adds the activity_logs table (added after initial schema)

CREATE TABLE activity_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id    text NOT NULL,
  text       text NOT NULL DEFAULT '',
  ts         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own activity_logs" ON activity_logs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_task ON activity_logs(task_id);
