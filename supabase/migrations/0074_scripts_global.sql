-- 0074: platform-global scripts (admin education content).
-- Scripts were strictly per-agency, so admin-authored scripts filed under one
-- agency never reached agents elsewhere. NULL agency_id = global, visible in
-- every agency's list (mirrors the campaign_creatives global pattern).
-- Existing rows keep their agency (no backfill); RLS agency_isolation still
-- applies to agency rows, global rows are readable platform-wide.
-- Idempotent.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'app' AND table_name = 'scripts'
      AND column_name = 'agency_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE app.scripts ALTER COLUMN agency_id DROP NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN app.scripts.agency_id IS
  'Owning agency; NULL = global script visible to every agency.';
