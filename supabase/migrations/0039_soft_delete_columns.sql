-- 0039_soft_delete_columns.sql
-- Adds `deleted_at TIMESTAMPTZ` to business tables that BaseRepository.softDelete() expects.
-- Closes the 2026-09-04 audit HIGH (re-confirmed in FEATURE_TESTS_2026-09-07.md):
--   DELETE /api/v1/scripts/{id}    → 500 column "deleted_at" does not exist
--   DELETE /api/v1/tutorials/{id}  → 500 column "deleted_at" does not exist
-- Also covers agents, campaigns, agencies, calls which use the same softDelete base impl.
--
-- All statements use IF NOT EXISTS so this migration is safe to re-apply.
-- Adds a partial index on (deleted_at) for each table so the active=false filter
-- stays fast as the table grows. CONCURRENTLY not used here (Supabase pooler handles
-- single-statement transactions; for very large tables, run this manually with
-- CONCURRENTLY out of a transaction block).

ALTER TABLE app.agents     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE app.campaigns  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE app.agencies   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE app.scripts    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE app.tutorials  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE app.calls      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS agents_deleted_at_idx     ON app.agents     (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS campaigns_deleted_at_idx  ON app.campaigns  (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS agencies_deleted_at_idx   ON app.agencies   (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS scripts_deleted_at_idx    ON app.scripts    (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS tutorials_deleted_at_idx  ON app.tutorials  (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS calls_deleted_at_idx      ON app.calls      (deleted_at) WHERE deleted_at IS NULL;
