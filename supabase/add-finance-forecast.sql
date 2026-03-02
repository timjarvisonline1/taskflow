/* ═══════════ FINANCE FORECAST — Schema Migration ═══════════ */
/* Adds tables for account balances, scheduled items, team members, */
/* and expected_payment_date column on finance_payments              */

/* ── 1. Account Balances (live snapshots from API syncs) ── */
CREATE TABLE IF NOT EXISTS account_balances (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform          text NOT NULL,
  account_id        text NOT NULL,
  account_name      text NOT NULL DEFAULT '',
  account_type      text NOT NULL DEFAULT 'checking',
  current_balance   numeric NOT NULL DEFAULT 0,
  available_balance numeric NOT NULL DEFAULT 0,
  currency          text NOT NULL DEFAULT 'USD',
  captured_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, account_id)
);

ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY ab_user ON account_balances FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_ab_user ON account_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_lookup ON account_balances(user_id, platform, account_id);

/* ── 2. Scheduled Items (recurring expenses, subscriptions, one-off commitments) ── */
CREATE TABLE IF NOT EXISTS scheduled_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text NOT NULL,
  amount         numeric NOT NULL DEFAULT 0,
  direction      text NOT NULL DEFAULT 'outflow',
  frequency      text NOT NULL DEFAULT 'monthly',
  day_of_month   integer,
  next_due       date,
  category       text NOT NULL DEFAULT '',
  account        text NOT NULL DEFAULT '',
  type           text NOT NULL DEFAULT 'expense',
  client_id      uuid REFERENCES clients(id) ON DELETE SET NULL,
  notes          text NOT NULL DEFAULT '',
  is_active      boolean NOT NULL DEFAULT true,
  last_paid_date date,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scheduled_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY si_user ON scheduled_items FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_si_user ON scheduled_items(user_id);
CREATE INDEX IF NOT EXISTS idx_si_active ON scheduled_items(user_id, is_active);

/* ── 3. Team Members (salaries, commissions) ── */
CREATE TABLE IF NOT EXISTS team_members (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text NOT NULL,
  role             text NOT NULL DEFAULT '',
  salary           numeric NOT NULL DEFAULT 0,
  pay_frequency    text NOT NULL DEFAULT 'monthly',
  pay_day          integer NOT NULL DEFAULT 1,
  commission_rate  numeric NOT NULL DEFAULT 0,
  commission_basis text NOT NULL DEFAULT '',
  start_date       date,
  notes            text NOT NULL DEFAULT '',
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY tm_user ON team_members FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_tm_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tm_active ON team_members(user_id, is_active);

/* ── 4. Add expected_payment_date to finance_payments (for invoice forecast) ── */
ALTER TABLE finance_payments ADD COLUMN IF NOT EXISTS expected_payment_date date;
