-- Performance indexes for frequent query patterns

-- Calls: polling hot path (filtered by agency+state, agent+state)
create index if not exists idx_calls_agency_state on app.calls (agency_id, state) where state in ('ringing','connected');
create index if not exists idx_calls_agent_state on app.calls (agent_id, state);
create index if not exists idx_calls_started_at on app.calls (agency_id, started_at desc);

-- Agents: routing hot path (available agents within an agency)
create index if not exists idx_agents_avail on app.agents (agency_id, approval_status, availability)
  where approval_status = 'approved' and availability = 'available';

-- Memberships: called on every API request (auth lookup)
create index if not exists idx_memberships_user_active on app.memberships (user_id, status) where status = 'active';

-- Wallet entries: balance checks and reports
create index if not exists idx_wallet_agency_created on app.wallet_entries (agency_id, created_at desc);
create index if not exists idx_wallet_agent on app.wallet_entries (agent_id);

-- Invoices: call finalization and reports
create index if not exists idx_invoices_agency_status on app.invoices (agency_id, status, created_at desc);
create index if not exists idx_invoices_call on app.invoices (call_id);

-- Leads: filtered listing
create index if not exists idx_leads_filters on app.leads (agency_id, status, source, assigned_agent_id);
create index if not exists idx_leads_created on app.leads (agency_id, created_at desc);

-- Recordings
create index if not exists idx_recordings_call on app.recordings (call_id);
create index if not exists idx_recordings_agency on app.recordings (agency_id, purge_at desc);

-- Campaigns
create index if not exists idx_campaigns_agency_status on app.campaigns (agency_id, status);
