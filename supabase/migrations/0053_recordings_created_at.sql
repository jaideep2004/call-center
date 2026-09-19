-- 0052 app.recordings was created without created_at (0001), but the
-- interface, findByAgency (ORDER BY created_at DESC), and purge logic all
-- assume it. Every Recordings-tab load 500s without this column.
-- Idempotent: existing rows get now() via the default.
ALTER TABLE app.recordings ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
