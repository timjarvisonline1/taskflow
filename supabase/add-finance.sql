-- ============================================================
-- TaskFlow Finance Migration
-- Adds finance_payments, payer_client_map tables
-- Extends clients table with status, email, company, notes
-- ============================================================

-- 1. Extend clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company text NOT NULL DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 2. Finance payments table (all-source payment records)
CREATE TABLE IF NOT EXISTS finance_payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date           date,
  amount         numeric NOT NULL DEFAULT 0,
  fee            numeric NOT NULL DEFAULT 0,
  net            numeric NOT NULL DEFAULT 0,
  source         text NOT NULL DEFAULT '',
  source_id      text NOT NULL DEFAULT '',
  payer_email    text NOT NULL DEFAULT '',
  payer_name     text NOT NULL DEFAULT '',
  description    text NOT NULL DEFAULT '',
  category       text NOT NULL DEFAULT '',
  client_id      uuid REFERENCES clients(id) ON DELETE SET NULL,
  campaign_id    uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  end_client     text NOT NULL DEFAULT '',
  notes          text NOT NULL DEFAULT '',
  status         text NOT NULL DEFAULT 'unmatched',
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE finance_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS finance_payments_user ON finance_payments;
CREATE POLICY finance_payments_user ON finance_payments FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_fp_user ON finance_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_fp_client ON finance_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_fp_status ON finance_payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_fp_payer ON finance_payments(user_id, payer_email);
CREATE INDEX IF NOT EXISTS idx_fp_source ON finance_payments(user_id, source, source_id);

-- 3. Payer-to-client mapping table
CREATE TABLE IF NOT EXISTS payer_client_map (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payer_email text NOT NULL DEFAULT '',
  payer_name  text NOT NULL DEFAULT '',
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  UNIQUE(user_id, payer_email, payer_name)
);

ALTER TABLE payer_client_map ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pcm_user ON payer_client_map;
CREATE POLICY pcm_user ON payer_client_map FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pcm_user ON payer_client_map(user_id);
