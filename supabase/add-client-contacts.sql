-- Client contacts: multiple people per client with name, email, role, phone
CREATE TABLE client_contacts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id  uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT '',
  email      text NOT NULL DEFAULT '',
  role       text NOT NULL DEFAULT '',
  phone      text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own client_contacts" ON client_contacts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_client_contacts_user ON client_contacts(user_id);
CREATE INDEX idx_client_contacts_client ON client_contacts(client_id);
CREATE INDEX idx_client_contacts_email ON client_contacts(user_id, email);
