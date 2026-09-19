-- 0042_concurrent_indexes.sql
-- Closes MED from docs/AUDIT_DEEP_2026-09-04.md Section 5: index builds that
-- take ACCESS EXCLUSIVE locks on populated prod tables.
--
-- HOW TO RUN: each statement must run as a separate, non-transactional
-- command (CONCURRENTLY is forbidden inside a transaction block):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0042_concurrent_indexes.sql
-- OR via the Supabase dashboard SQL editor (set the "Auto-commit" toggle ON).
-- The standard runner (scripts/run-migrations.cjs) wraps files in BEGIN/COMMIT
-- and CANNOT apply this file — apply it with psql, then record the version:
--   insert into public.schema_migrations (version) values ('0042');
--
-- SCOPE (verified 2026-09-15 against information_schema + pg_indexes):
-- Only NET-NEW coverage lives here. Everything else from the original draft
-- was pruned for one of these reasons:
--   (a) duplicate pattern — an equivalent index already exists under another
--       name (e.g. 0010's idx_calls_started_at vs perf_calls_agency_started_idx;
--       0019's wallet_transfers indexes; 0029's agent_subscriptions_active_uq;
--       leads phone/email hash indexes). Duplicates double write-amplification
--       on hot tables for zero planner benefit.
--   (b) dead reference — column never existed in any migration:
--       campaign_assignments.publisher_id (multi-publisher lives in the
--       app.campaign_publishers join table since 0043),
--       retreaver_calls.company_id / received_at and
--       rtb_reservations.company_id (0021 defines synced_at/created_at),
--       wallet_transfers.agency_id / status (0019 defines from_agency_id /
--       to_agent_id and no status column).
--
-- All statements are IF NOT EXISTS so they are safe to re-run.

-- Agent-fee sweeps: pending-fee lookup and invoice linkage.
CREATE INDEX CONCURRENTLY IF NOT EXISTS agent_fees_invoice_idx
  ON app.agent_fees(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS agent_fees_due_idx
  ON app.agent_fees(due_date, status) WHERE status = 'pending';

-- RTB reservation lifecycle: expiry sweeps + status filtering.
CREATE INDEX CONCURRENTLY IF NOT EXISTS rtb_reservations_status_idx
  ON app.rtb_reservations(status, expires_at);

-- Subscription allowance checks: (calls_used, plan_id) lookups.
CREATE INDEX CONCURRENTLY IF NOT EXISTS missing_idx_subscriptions_calls_used
  ON app.agent_subscriptions(calls_used, plan_id);

-- Outbox dispatcher: pending topics.
CREATE INDEX CONCURRENTLY IF NOT EXISTS missing_idx_outbox_topic
  ON app.outbox(topic, dispatched_at) WHERE dispatched_at IS NULL;
