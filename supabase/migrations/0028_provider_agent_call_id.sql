-- 0028: agent-leg provider call id on app.calls — closes schema drift
--
-- The call orchestrator, calls repository, API filter and diagnostic scripts
-- have read/written app.calls.provider_agent_call_id since before release, but
-- no migration ever created the column. A database built from migrations alone
-- failed at runtime on the agent-leg lookups (ring cancel, failover, hangup,
-- echo-event resolution).

alter table app.calls
  add column if not exists provider_agent_call_id text;

-- Lookup pattern: WHERE provider = $1 AND provider_agent_call_id = $2
create index if not exists idx_calls_provider_agent_leg
  on app.calls (provider, provider_agent_call_id)
  where provider_agent_call_id is not null;