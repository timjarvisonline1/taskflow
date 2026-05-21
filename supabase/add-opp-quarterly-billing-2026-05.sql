-- Add quarterly_billing flag to opportunities (default true = paid quarterly in advance)
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS quarterly_billing boolean NOT NULL DEFAULT true;
