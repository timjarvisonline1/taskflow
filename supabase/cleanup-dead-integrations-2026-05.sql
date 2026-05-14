-- Remove integration_credentials rows for platforms whose code was deleted in the May 2026 cull.
-- The app no longer tries to sync these, but the rows still appear in the DB.
-- Safe to run multiple times. Run in Supabase SQL Editor.

BEGIN;

DELETE FROM integration_credentials
WHERE platform IN ('instantly', 'zoho_books', 'zoho_payments', 'google_analytics');

-- Also clear out sync_log entries for those platforms (table optional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_log') THEN
    DELETE FROM sync_log WHERE platform IN ('instantly', 'zoho_books', 'zoho_payments', 'google_analytics');
  END IF;
END $$;

COMMIT;
