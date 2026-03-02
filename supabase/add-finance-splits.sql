-- ============================================================
-- TaskFlow Finance — Payment Splits Migration
-- Adds finance_payment_splits table for split payments
-- ============================================================

CREATE TABLE IF NOT EXISTS finance_payment_splits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id      uuid NOT NULL REFERENCES finance_payments(id) ON DELETE CASCADE,
  amount          numeric NOT NULL DEFAULT 0,
  category        text NOT NULL DEFAULT '',
  end_client      text NOT NULL DEFAULT '',
  campaign_id     uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  notes           text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE finance_payment_splits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fps_user ON finance_payment_splits;
CREATE POLICY fps_user ON finance_payment_splits FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_fps_payment ON finance_payment_splits(payment_id);
CREATE INDEX IF NOT EXISTS idx_fps_user ON finance_payment_splits(user_id);
