-- 0045: Agent live-for-campaign selections.
-- Client: agents go to Take Calls, select a campaign, then live/active for THAT campaign.
-- Global agents.availability stays as master switch; this table scopes it per campaign.

create table if not exists app.agent_campaign_selections (
  agent_id uuid not null references app.agents(id) on delete cascade,
  campaign_id uuid not null references app.campaigns(id) on delete cascade,
  is_live boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (agent_id, campaign_id)
);

alter table app.agent_campaign_selections enable row level security;

-- platform-managed: allow all via service role policies used elsewhere; agency isolation
-- follows agents table (no per-row agency column, join via agents when needed).
create policy allow_all on app.agent_campaign_selections using (true) with check (true);

create index if not exists agent_campaign_selections_campaign_live_idx
  on app.agent_campaign_selections(campaign_id, is_live) where is_live = true;
create index if not exists agent_campaign_selections_agent_idx
  on app.agent_campaign_selections(agent_id);
