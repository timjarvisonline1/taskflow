-- ═══════════ ENHANCE INSTANTLY EMAILS: THREAD SUPPORT + RICH FIELDS ═══════════
-- Promotes thread_id from metadata to its own column, adds unread/status/preview fields

-- ═══════════ 1. ADD COLUMNS TO EMAILS TABLE ═══════════

ALTER TABLE instantly_emails ADD COLUMN IF NOT EXISTS thread_id text NOT NULL DEFAULT '';
ALTER TABLE instantly_emails ADD COLUMN IF NOT EXISTS is_unread boolean NOT NULL DEFAULT false;
ALTER TABLE instantly_emails ADD COLUMN IF NOT EXISTS i_status int NOT NULL DEFAULT 0;
ALTER TABLE instantly_emails ADD COLUMN IF NOT EXISTS content_preview text NOT NULL DEFAULT '';
ALTER TABLE instantly_emails ADD COLUMN IF NOT EXISTS eaccount text NOT NULL DEFAULT '';

-- ═══════════ 2. ADD INDEXES FOR THREAD QUERIES ═══════════

CREATE INDEX IF NOT EXISTS idx_ie_thread ON instantly_emails(user_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_ie_unread ON instantly_emails(user_id, is_unread) WHERE is_unread = true;
