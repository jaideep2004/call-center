-- 0073: tutorial_progress.user_id was uuid, but every caller passes the
-- better-auth login id, which is TEXT (nanoid, e.g. D9kM285B...). Any
-- non-manager hit `invalid input syntax for type uuid` on both the
-- published-list JOIN and the progress upsert — the whole Tutorials tab 500d
-- for agents and publishers. Align with memberships.user_id (text).
-- Existing uuid values (if any) cast to text losslessly.
-- Idempotent.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'app' AND table_name = 'tutorial_progress'
      AND column_name = 'user_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE app.tutorial_progress ALTER COLUMN user_id TYPE text;
  END IF;
END $$;
