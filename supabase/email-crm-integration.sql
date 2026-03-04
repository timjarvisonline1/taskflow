-- Email CRM Integration Migration
-- Adds CC tracking, end-client associations, and opportunity linking

-- 1. CC emails on gmail_threads (for matching From + To + CC)
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS cc_emails text NOT NULL DEFAULT '';

-- 2. End-client + opportunity tracking on gmail_threads (client_id and campaign_id already exist)
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS end_client text NOT NULL DEFAULT '';
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS opportunity_id uuid;

-- 3. End-client field on contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS end_client text NOT NULL DEFAULT '';
