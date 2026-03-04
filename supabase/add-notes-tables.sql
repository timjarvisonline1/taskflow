-- Campaign Notes table
CREATE TABLE campaign_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  text        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE campaign_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own campaign_notes" ON campaign_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Client Notes table
CREATE TABLE client_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id  uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  text       text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own client_notes" ON client_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
