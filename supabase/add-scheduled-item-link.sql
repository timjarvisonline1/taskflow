-- Add scheduled_item_id FK to finance_payments
-- Allows linking expenses to recurring items (subscriptions, vendor payments, etc.)
ALTER TABLE finance_payments
  ADD COLUMN IF NOT EXISTS scheduled_item_id uuid
  REFERENCES scheduled_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fp_scheduled_item
  ON finance_payments(scheduled_item_id);
