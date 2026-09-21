-- 0033: Missing hot-path indexes (Phase 1.5 / 2.9)

-- Folded in from orphaned 0028b_provider_agent_call_id.sql (that filename never
-- matches the runner's ^\d{4}_ pattern, so fresh DBs built from migrations alone
-- never got the column). Recorded DBs skip this file entirely — safe.
alter table app.calls add column if not exists provider_agent_call_id text;

create index if not exists idx_calls_provider_agent_call on app.calls(provider, provider_agent_call_id) where provider_agent_call_id is not null;
create index if not exists idx_phone_numbers_campaign on app.phone_numbers(campaign_id);
create index if not exists idx_retreaver_calls_link on app.retreaver_calls(caller_hash, dialed_hash, start_time) where caller_hash is not null;
