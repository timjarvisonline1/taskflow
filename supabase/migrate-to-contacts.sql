-- Migration: Replace client_contacts with standalone contacts table
-- Run this in Supabase SQL Editor

-- 1. Drop the old client_contacts table
DROP TABLE IF EXISTS client_contacts;

-- 2. Create the new standalone contacts table (CRM-ready)
CREATE TABLE contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   uuid REFERENCES clients(id) ON DELETE SET NULL,  -- optional link to client
  first_name  text NOT NULL DEFAULT '',
  last_name   text NOT NULL DEFAULT '',
  email       text NOT NULL DEFAULT '',
  phone       text NOT NULL DEFAULT '',
  role        text NOT NULL DEFAULT '',
  company     text NOT NULL DEFAULT '',
  website     text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'active',   -- 'active' or 'lapsed'
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own contacts" ON contacts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Indexes
CREATE INDEX idx_contacts_user ON contacts(user_id);
CREATE INDEX idx_contacts_client ON contacts(client_id);
CREATE INDEX idx_contacts_email ON contacts(user_id, email);
CREATE INDEX idx_contacts_company ON contacts(user_id, company);
