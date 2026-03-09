-- Add group call fields to meetings table
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS is_group_call boolean NOT NULL DEFAULT false;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS group_call_type text NOT NULL DEFAULT '';
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS kajabi_report_html text NOT NULL DEFAULT '';

-- Partial index for efficient group call filtering
CREATE INDEX IF NOT EXISTS idx_meetings_group_call ON meetings(user_id, is_group_call) WHERE is_group_call = true;
