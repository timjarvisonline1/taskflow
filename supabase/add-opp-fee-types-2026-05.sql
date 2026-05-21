-- Add fee_types column to opportunities.
-- Stores comma-separated list of enabled fee types: 'strategy', 'setup', 'monthly'.
-- Run in Supabase SQL Editor.

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS fee_types text;
