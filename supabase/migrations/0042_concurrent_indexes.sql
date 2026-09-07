-- 0042_concurrent_indexes.sql
-- Closes MED from docs/AUDIT_DEEP_2026-09-04.md Section 5: 24 post-0001
-- CREATE INDEX statements that take ACCESS EXCLUSIVE locks during build.
-- On a populated prod DB (calls, call_events, wallet_entries, invoices) this
-- blocks writes for the duration of the index build.
--
-- This file REQUIRES a maintenance window. Each statement must be run as a
-- separate, non-transactional command. psql can do this with `-v ON_ERROR_STOP=1`
-- and by NOT wrapping in BEGIN/COMMIT. CONCURRENTLY is forbidden inside a
-- transaction.
--
-- All statements are IF NOT EXISTS so they are safe to re-run.
--
-- Run with:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0042_concurrent_indexes.sql
-- OR via the Supabase dashboard SQL editor (set the "Auto-commit" toggle ON).

-- 0003_payments_and_recordings.sql:15
CREATE INDEX CONCURRENTLY IF NOT EXISTS payments_agency_idx
  ON app.payments(agency_id, created_at desc);

-- 0005_scripts_and_tutorials.sql:14, 31
CREATE INDEX CONCURRENTLY IF NOT EXISTS scripts_agency_idx
  ON app.scripts(agency_id, created_at desc) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS tutorials_agency_idx
  ON app.tutorials(agency_id, created_at desc) WHERE deleted_at IS NULL;

-- 0006_lead_enhancements.sql:28
CREATE INDEX CONCURRENTLY IF NOT EXISTS lead_notes_lead_idx
  ON app.lead_notes(lead_id, created_at desc);

-- 0007_dispositions.sql:16, 20
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dispositions_call
  ON app.dispositions(call_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS dispositions_agent_idx
  ON app.dispositions(agent_id, created_at desc);

-- 0008_agent_subscriptions.sql:18, 35
CREATE INDEX CONCURRENTLY IF NOT EXISTS agent_plans_agency_idx
  ON app.agent_plans(agency_id) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS agent_subs_agent_idx
  ON app.agent_subscriptions(agent_id, status) WHERE status = 'active';

-- 0009_sub_agency.sql:18, 19
CREATE INDEX CONCURRENTLY IF NOT EXISTS invites_token_idx
  ON app.recruitment_invites(token);
CREATE INDEX CONCURRENTLY IF NOT EXISTS invites_inviter_idx
  ON app.recruitment_invites(inviter_membership_id, status);

-- 0010_performance_indexes.sql (14 statements)
CREATE INDEX CONCURRENTLY IF NOT EXISTS perf_calls_agency_started_idx
  ON app.calls(agency_id, started_at desc);
CREATE INDEX CONCURRENTLY IF NOT EXISTS perf_calls_state_idx
  ON app.calls(state, started_at desc);
CREATE INDEX CONCURRENTLY IF NOT EXISTS perf_calls_campaign_idx
  ON app.calls(campaign_id, started_at desc);
CREATE INDEX CONCURRENTLY IF NOT EXISTS perf_calls_agent_idx
  ON app.calls(agent_id, started_at desc) WHERE agent_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS perf_wallet_agency_created_idx
  ON app.wallet_entries(agency_id, created_at desc);
CREATE INDEX CONCURRENTLY IF NOT EXISTS perf_wallet_call_idx
  ON app.wallet_entries(call_id) WHERE call_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS perf_invoices_agency_idx
  ON app.invoices(agency_id, created_at desc);
CREATE INDEX CONCURRENTLY IF NOT EXISTS perf_invoices_status_idx
  ON app.invoices(status, created_at desc) WHERE status = 'paid';
CREATE INDEX CONCURRENTLY IF NOT EXISTS perf_events_call_idx
  ON app.call_events(call_id, occurred_at desc);
CREATE INDEX CONCURRENTLY IF NOT EXISTS perf_events_provider_idx
  ON app.call_events(provider, provider_event_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS perf_leads_agency_idx
  ON app.leads(agency_id, created_at desc) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS perf_leads_assigned_idx
  ON app.leads(assigned_agent_id, created_at desc) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS perf_audit_agency_idx
  ON app.audit_logs(agency_id, created_at desc) WHERE agency_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS perf_outbox_undispatched_idx
  ON app.outbox(occurred_at) WHERE dispatched_at IS NULL;

-- 0015_scripts_campaign.sql:3
CREATE INDEX CONCURRENTLY IF NOT EXISTS scripts_campaign_idx
  ON app.scripts(campaign_id) WHERE campaign_id IS NOT NULL;

-- 0016_publishers.sql:15
CREATE INDEX CONCURRENTLY IF NOT EXISTS publishers_active_idx
  ON app.publishers(active) WHERE active = true AND deleted_at IS NULL;

-- 0017_campaign_assignments.sql:11-14
CREATE INDEX CONCURRENTLY IF NOT EXISTS campaign_assignments_campaign_idx
  ON app.campaign_assignments(campaign_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS campaign_assignments_agency_idx
  ON app.campaign_assignments(agency_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS campaign_assignments_agent_idx
  ON app.campaign_assignments(agent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS campaign_assignments_publisher_idx
  ON app.campaign_assignments(publisher_id) WHERE publisher_id IS NOT NULL;

-- 0019_wallet_transfers.sql:13, 14
CREATE INDEX CONCURRENTLY IF NOT EXISTS wallet_transfers_agency_idx
  ON app.wallet_transfers(agency_id, created_at desc);
CREATE INDEX CONCURRENTLY IF NOT EXISTS wallet_transfers_status_idx
  ON app.wallet_transfers(status, created_at desc);

-- 0021_retreaver.sql:30, 31, 51, 62
CREATE INDEX CONCURRENTLY IF NOT EXISTS retreaver_calls_company_idx
  ON app.retreaver_calls(company_id, received_at desc);
CREATE INDEX CONCURRENTLY IF NOT EXISTS retreaver_calls_linked_idx
  ON app.retreaver_calls(call_id) WHERE call_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS rtb_reservations_company_idx
  ON app.rtb_reservations(company_id, created_at desc);
CREATE INDEX CONCURRENTLY IF NOT EXISTS rtb_reservations_status_idx
  ON app.rtb_reservations(status, expires_at);

-- 0027_public_leads_and_rls.sql (4 indexes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS public_leads_phone_hash_idx
  ON app.leads(phone_hash) WHERE phone_hash IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS public_leads_email_hash_idx
  ON app.leads(email_hash) WHERE email_hash IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS public_leads_agency_idx
  ON app.leads(agency_id, created_at desc) WHERE agency_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS public_leads_assigned_idx
  ON app.leads(assigned_agent_id) WHERE assigned_agent_id IS NOT NULL;

-- 0029_subscription_race.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS agent_subscriptions_active_uq
  ON app.agent_subscriptions(agent_id) WHERE status = 'active';

-- 0030_bid_overrides.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS bid_overrides_campaign_idx
  ON app.bid_overrides(campaign_id);

-- 0031_agent_fees.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS agent_fees_agent_idx
  ON app.agent_fees(agent_id, due_date desc);
CREATE INDEX CONCURRENTLY IF NOT EXISTS agent_fees_invoice_idx
  ON app.agent_fees(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS agent_fees_due_idx
  ON app.agent_fees(due_date, status) WHERE status = 'pending';

-- 0033_missing_indexes.sql (3)
CREATE INDEX CONCURRENTLY IF NOT EXISTS missing_idx_calls_provider_call
  ON app.calls(provider, provider_call_id) WHERE provider_call_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS missing_idx_outbox_topic
  ON app.outbox(topic, dispatched_at) WHERE dispatched_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS missing_idx_subscriptions_calls_used
  ON app.agent_subscriptions(calls_used, plan_id);
