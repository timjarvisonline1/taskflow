-- ═══════════ PROSPECT COMPANIES ═══════════
CREATE TABLE IF NOT EXISTS prospect_companies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  website     text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'active',
  notes       text NOT NULL DEFAULT '',
  source      text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE prospect_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own prospect_companies" ON prospect_companies
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pc_user ON prospect_companies(user_id);

-- ═══════════ PROSPECTS ═══════════
CREATE TABLE IF NOT EXISTS prospects (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prospect_company_id uuid REFERENCES prospect_companies(id) ON DELETE SET NULL,
  first_name          text NOT NULL DEFAULT '',
  last_name           text NOT NULL DEFAULT '',
  email               text NOT NULL DEFAULT '',
  phone               text NOT NULL DEFAULT '',
  role                text NOT NULL DEFAULT '',
  linkedin_url        text NOT NULL DEFAULT '',
  source              text NOT NULL DEFAULT '',
  notes               text NOT NULL DEFAULT '',
  status              text NOT NULL DEFAULT 'active',
  last_contacted_at   timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own prospects" ON prospects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_prospects_user ON prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_prospects_company ON prospects(prospect_company_id);
CREATE INDEX IF NOT EXISTS idx_prospects_email ON prospects(user_id, email);

-- ═══════════ OPPORTUNITY FK COLUMNS ═══════════
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS prospect_company_id uuid REFERENCES prospect_companies(id) ON DELETE SET NULL;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_opp_pc ON opportunities(prospect_company_id);
CREATE INDEX IF NOT EXISTS idx_opp_prospect ON opportunities(prospect_id);
