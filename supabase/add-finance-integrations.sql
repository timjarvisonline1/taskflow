/* ═══════════ FINANCE INTEGRATIONS — Schema Migration ═══════════ */
/* Extends finance_payments for inflow/outflow tracking + adds integration tables */

/* ── 1. Extend finance_payments with new columns ── */
ALTER TABLE finance_payments ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'inflow';
ALTER TABLE finance_payments ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'payment';
ALTER TABLE finance_payments ADD COLUMN IF NOT EXISTS external_status text NOT NULL DEFAULT '';
ALTER TABLE finance_payments ADD COLUMN IF NOT EXISTS linked_transaction_id uuid REFERENCES finance_payments(id) ON DELETE SET NULL;
ALTER TABLE finance_payments ADD COLUMN IF NOT EXISTS pending_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE finance_payments ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_fp_direction ON finance_payments(user_id, direction);
CREATE INDEX IF NOT EXISTS idx_fp_type ON finance_payments(user_id, type);
CREATE INDEX IF NOT EXISTS idx_fp_linked ON finance_payments(linked_transaction_id);
CREATE INDEX IF NOT EXISTS idx_fp_external_status ON finance_payments(user_id, external_status);

/* ── 2. Integration credentials table ── */
CREATE TABLE IF NOT EXISTS integration_credentials (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform        text NOT NULL,
  credentials     jsonb NOT NULL DEFAULT '{}',
  config          jsonb NOT NULL DEFAULT '{}',
  last_sync_at    timestamptz,
  last_sync_status text NOT NULL DEFAULT 'never',
  last_sync_message text NOT NULL DEFAULT '',
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY ic_user ON integration_credentials FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_ic_user ON integration_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_ic_platform ON integration_credentials(user_id, platform);

/* ── 3. Sync log table ── */
CREATE TABLE IF NOT EXISTS sync_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform        text NOT NULL,
  sync_type       text NOT NULL DEFAULT 'poll',
  records_fetched integer NOT NULL DEFAULT 0,
  records_inserted integer NOT NULL DEFAULT 0,
  records_updated integer NOT NULL DEFAULT 0,
  error_message   text NOT NULL DEFAULT '',
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);

ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY sl_user ON sync_log FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_sl_user_platform ON sync_log(user_id, platform, started_at DESC);
