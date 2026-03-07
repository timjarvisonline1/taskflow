-- Add website column to clients table for domain-based Contact Review matching
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website text NOT NULL DEFAULT '';
