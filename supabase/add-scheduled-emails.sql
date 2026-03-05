-- Scheduled emails table for schedule-send feature
-- Emails are stored here and sent via client-side polling when the app tab is open

CREATE TABLE scheduled_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_emails text NOT NULL,
  cc_emails text DEFAULT '',
  bcc_emails text DEFAULT '',
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  attachments jsonb DEFAULT '[]',
  thread_id text DEFAULT '',
  message_id text DEFAULT '',
  categorization jsonb DEFAULT '{}',
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own scheduled_emails" ON scheduled_emails
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_sched_emails_pending ON scheduled_emails(user_id, status, scheduled_at)
  WHERE status = 'pending';
