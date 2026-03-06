-- End Clients managed entity table
CREATE TABLE IF NOT EXISTS end_clients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  client_id  uuid REFERENCES clients(id) ON DELETE SET NULL,
  notes      text NOT NULL DEFAULT '',
  status     text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE end_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own end_clients"
  ON end_clients FOR ALL
  USING (auth.uid() = user_id);
