-- 0075: skill visibility (default vs exclusive).
-- Agents pick only Default verticals (Medicare, Final Expense); Exclusive
-- skills are head/admin tooling and must never appear in agent pickers.
-- Backfill: the two platform defaults stay default, everything else becomes
-- exclusive (matches the live library). New skills default to default.
-- Idempotent.
ALTER TABLE app.skills ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'default';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'skills_visibility_check') THEN
    ALTER TABLE app.skills
      ADD CONSTRAINT skills_visibility_check CHECK (visibility IN ('default', 'exclusive'));
  END IF;
END $$;

UPDATE app.skills
   SET visibility = 'exclusive'
 WHERE slug NOT IN ('medicare', 'final-expense')
   AND visibility = 'default';
