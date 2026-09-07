-- 0041_subscription_calls_used_idempotent.sql
-- Closes MED from docs/AUDIT_DEEP_2026-09-04.md Section 3:
--   `agent_subscriptions.incrementCallsUsed` was not transactional with the
--   invoice ON CONFLICT guard, so a redelivered finalize + manual re-finalize
--   could double-decrement calls_used.
--
-- Fix: a per-call ledger table. The subscription only increments when a row
-- is inserted (UNIQUE on (subscription_id, call_id) blocks the double-count).
-- This makes incrementCallsUsed naturally idempotent at the SQL level.
--
-- All statements are IF NOT EXISTS so this is re-runnable.

create table if not exists app.subscription_call_charges (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references app.agent_subscriptions(id),
  call_id uuid not null references app.calls(id),
  created_at timestamptz not null default now(),
  unique (subscription_id, call_id)
);

create index if not exists subscription_call_charges_sub_idx
  on app.subscription_call_charges(subscription_id, created_at desc);

create index if not exists subscription_call_charges_call_idx
  on app.subscription_call_charges(call_id);

comment on table app.subscription_call_charges is
  'Per-call subscription usage ledger. Insert-only; UNIQUE(subscription_id, call_id) makes incrementCallsUsed idempotent.';
