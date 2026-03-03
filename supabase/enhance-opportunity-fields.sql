-- Enhance Opportunity Fields — Phase 1B
-- Adds brief/prospect fields for Zapier intake and close lost reason

-- Brief/prospect fields
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS contact_job_title text NOT NULL DEFAULT '';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS prospect_website text NOT NULL DEFAULT '';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS previous_relationship text NOT NULL DEFAULT '';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS company_description text NOT NULL DEFAULT '';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS prospect_description text NOT NULL DEFAULT '';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS video_strategy_benefits text NOT NULL DEFAULT '';

-- Close lost reason
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS close_reason text NOT NULL DEFAULT '';
