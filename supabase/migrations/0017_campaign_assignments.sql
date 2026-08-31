create table if not exists app.campaign_assignments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references app.campaigns(id) on delete cascade,
  agency_id uuid references app.agencies(id) on delete cascade,
  agent_id uuid references app.agents(id) on delete cascade,
  assigned_by text,
  created_at timestamptz not null default now(),
  check (agency_id is not null or agent_id is not null)
);

create unique index campaign_assignments_agency_uq on app.campaign_assignments(campaign_id, agency_id) where agency_id is not null;
create unique index campaign_assignments_agent_uq on app.campaign_assignments(campaign_id, agent_id) where agent_id is not null;
create index campaign_assignments_agency_idx on app.campaign_assignments(agency_id);
create index campaign_assignments_agent_idx on app.campaign_assignments(agent_id);
