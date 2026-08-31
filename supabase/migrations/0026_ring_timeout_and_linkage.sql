-- 0026: Ring timeout & failover, Retreaver↔call linkage, agent concurrency
-- All statements are idempotent; safe to apply to existing databases.

-- B2: per-campaign ring timeout + max attempts; per-attempt ring clock on calls
alter table app.campaigns add column if not exists ring_timeout_seconds int not null default 30 check (ring_timeout_seconds > 0);
alter table app.campaigns add column if not exists max_ring_attempts int not null default 2 check (max_ring_attempts >= 1);
alter table app.calls add column if not exists ring_started_at timestamptz;
create index if not exists calls_ring_started_idx on app.calls(ring_started_at) where ring_started_at is not null and state = 'ringing';

-- B3: linkage between app.calls and retreaver_calls
alter table app.calls add column if not exists to_number text;
alter table app.calls add column if not exists retreaver_call_id uuid references app.retreaver_calls(id);
alter table app.retreaver_calls add column if not exists call_id uuid references app.calls(id);
alter table app.retreaver_calls add column if not exists caller_hash text;
alter table app.retreaver_calls add column if not exists dialed_hash text;
alter table app.retreaver_calls add column if not exists start_time timestamptz;
create index if not exists calls_to_number_idx on app.calls(to_number) where to_number is not null;
create index if not exists calls_retreaver_call_idx on app.calls(retreaver_call_id) where retreaver_call_id is not null;
create index if not exists retreaver_calls_call_idx on app.retreaver_calls(call_id) where call_id is not null;
create index if not exists retreaver_calls_match_idx on app.retreaver_calls(caller_hash, dialed_hash, start_time) where caller_hash is not null and dialed_hash is not null;

-- Backfill caller hashes for pre-existing retreaver rows (pgcrypto from 0001)
update app.retreaver_calls
   set caller_hash = encode(digest(caller, 'sha256'), 'hex')
 where caller_hash is null and caller is not null;

-- B1: partial index backing the derived "busy" check (active calls per agent)
create index if not exists calls_active_agent_idx on app.calls(agent_id) where state in ('ringing','connecting','connected');

-- C: agency-scoped invoice lookups (margin reports / finance views)
create index if not exists invoices_agency_created_idx on app.invoices(agency_id, created_at desc);
