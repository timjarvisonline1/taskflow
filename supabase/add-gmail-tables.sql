-- Gmail Threads metadata cache
CREATE TABLE gmail_threads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id       text NOT NULL,
  subject         text NOT NULL DEFAULT '',
  from_email      text NOT NULL DEFAULT '',
  from_name       text NOT NULL DEFAULT '',
  to_emails       text NOT NULL DEFAULT '',
  snippet         text NOT NULL DEFAULT '',
  last_message_at timestamptz,
  message_count   integer NOT NULL DEFAULT 1,
  is_unread       boolean NOT NULL DEFAULT false,
  labels          text NOT NULL DEFAULT '',
  client_id       uuid REFERENCES clients(id) ON DELETE SET NULL,
  campaign_id     uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  synced_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, thread_id)
);
ALTER TABLE gmail_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own gmail_threads" ON gmail_threads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_gmail_threads_user ON gmail_threads(user_id);
CREATE INDEX idx_gmail_threads_client ON gmail_threads(client_id);
CREATE INDEX idx_gmail_threads_last_msg ON gmail_threads(user_id, last_message_at DESC);
