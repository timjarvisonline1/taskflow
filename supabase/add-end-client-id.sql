-- Migration: Add end_client_id UUID FK to all entity tables
-- Run BEFORE deploying JS changes. The old end_client text column remains populated.

-- 1a. Add end_client_id columns (nullable)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_client_id uuid REFERENCES end_clients(id) ON DELETE SET NULL;
ALTER TABLE done ADD COLUMN IF NOT EXISTS end_client_id uuid REFERENCES end_clients(id) ON DELETE SET NULL;
ALTER TABLE review ADD COLUMN IF NOT EXISTS end_client_id uuid REFERENCES end_clients(id) ON DELETE SET NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS end_client_id uuid REFERENCES end_clients(id) ON DELETE SET NULL;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS end_client_id uuid REFERENCES end_clients(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS end_client_id uuid REFERENCES end_clients(id) ON DELETE SET NULL;
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS end_client_id uuid REFERENCES end_clients(id) ON DELETE SET NULL;
ALTER TABLE finance_payments ADD COLUMN IF NOT EXISTS end_client_id uuid REFERENCES end_clients(id) ON DELETE SET NULL;
ALTER TABLE finance_payment_splits ADD COLUMN IF NOT EXISTS end_client_id uuid REFERENCES end_clients(id) ON DELETE SET NULL;
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS end_client_id uuid REFERENCES end_clients(id) ON DELETE SET NULL;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS end_client_id uuid REFERENCES end_clients(id) ON DELETE SET NULL;

-- 1b. Indexes for FK lookups
CREATE INDEX IF NOT EXISTS idx_tasks_ecid ON tasks(end_client_id);
CREATE INDEX IF NOT EXISTS idx_done_ecid ON done(end_client_id);
CREATE INDEX IF NOT EXISTS idx_review_ecid ON review(end_client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_ecid ON campaigns(end_client_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_ecid ON opportunities(end_client_id);
CREATE INDEX IF NOT EXISTS idx_contacts_ecid ON contacts(end_client_id);
CREATE INDEX IF NOT EXISTS idx_gmail_threads_ecid ON gmail_threads(end_client_id);
CREATE INDEX IF NOT EXISTS idx_fp_ecid ON finance_payments(end_client_id);
CREATE INDEX IF NOT EXISTS idx_fps_ecid ON finance_payment_splits(end_client_id);
CREATE INDEX IF NOT EXISTS idx_kc_ecid ON knowledge_chunks(end_client_id);
CREATE INDEX IF NOT EXISTS idx_meetings_ecid ON meetings(end_client_id);

-- 1c. Backfill: resolve end_client text names to end_client_id UUIDs
-- Prerequisites: syncEndClientRecords() should have run to populate end_clients table
UPDATE tasks t SET end_client_id = ec.id FROM end_clients ec WHERE ec.name = t.end_client AND ec.user_id = t.user_id AND t.end_client IS NOT NULL AND t.end_client != '' AND t.end_client_id IS NULL;
UPDATE done d SET end_client_id = ec.id FROM end_clients ec WHERE ec.name = d.end_client AND ec.user_id = d.user_id AND d.end_client IS NOT NULL AND d.end_client != '' AND d.end_client_id IS NULL;
UPDATE review r SET end_client_id = ec.id FROM end_clients ec WHERE ec.name = r.end_client AND ec.user_id = r.user_id AND r.end_client IS NOT NULL AND r.end_client != '' AND r.end_client_id IS NULL;
UPDATE campaigns c SET end_client_id = ec.id FROM end_clients ec WHERE ec.name = c.end_client AND ec.user_id = c.user_id AND c.end_client IS NOT NULL AND c.end_client != '' AND c.end_client_id IS NULL;
UPDATE opportunities o SET end_client_id = ec.id FROM end_clients ec WHERE ec.name = o.end_client AND ec.user_id = o.user_id AND o.end_client IS NOT NULL AND o.end_client != '' AND o.end_client_id IS NULL;
UPDATE contacts ct SET end_client_id = ec.id FROM end_clients ec WHERE ec.name = ct.end_client AND ec.user_id = ct.user_id AND ct.end_client IS NOT NULL AND ct.end_client != '' AND ct.end_client_id IS NULL;
UPDATE gmail_threads gt SET end_client_id = ec.id FROM end_clients ec WHERE ec.name = gt.end_client AND ec.user_id = gt.user_id AND gt.end_client IS NOT NULL AND gt.end_client != '' AND gt.end_client_id IS NULL;
UPDATE finance_payments fp SET end_client_id = ec.id FROM end_clients ec WHERE ec.name = fp.end_client AND ec.user_id = fp.user_id AND fp.end_client IS NOT NULL AND fp.end_client != '' AND fp.end_client_id IS NULL;
-- finance_payment_splits has no user_id — join through finance_payments
UPDATE finance_payment_splits fps SET end_client_id = ec.id FROM end_clients ec, finance_payments fp WHERE fp.id = fps.payment_id AND ec.name = fps.end_client AND ec.user_id = fp.user_id AND fps.end_client IS NOT NULL AND fps.end_client != '' AND fps.end_client_id IS NULL;
UPDATE knowledge_chunks kc SET end_client_id = ec.id FROM end_clients ec WHERE ec.name = kc.end_client AND ec.user_id = kc.user_id AND kc.end_client IS NOT NULL AND kc.end_client != '' AND kc.end_client_id IS NULL;
UPDATE meetings m SET end_client_id = ec.id FROM end_clients ec WHERE ec.name = m.end_client AND ec.user_id = m.user_id AND m.end_client IS NOT NULL AND m.end_client != '' AND m.end_client_id IS NULL;
