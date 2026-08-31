-- 0033: Missing hot-path indexes (Phase 1.5 / 2.9)

create index if not exists idx_calls_provider_agent_call on app.calls(provider, provider_agent_call_id) where provider_agent_call_id is not null;
create index if not exists idx_phone_numbers_campaign on app.phone_numbers(campaign_id);
create index if not exists idx_retreaver_calls_link on app.retreaver_calls(caller_hash, dialed_hash, start_time) where caller_hash is not null;
