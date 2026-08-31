alter table app.wallet_entries add column if not exists agent_id uuid references app.agents(id);
create index if not exists wallet_entries_agent_idx on app.wallet_entries(agent_id, created_at desc);

create table if not exists app.agent_plans (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references app.agencies(id),
  name text not null,
  price_cents int not null check (price_cents >= 0),
  call_allowance int not null check (call_allowance > 0),
  features jsonb not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app.agent_plans enable row level security;
create policy agency_isolation on app.agent_plans using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create index agent_plans_agency_idx on app.agent_plans(agency_id);

create table if not exists app.agent_subscriptions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references app.agents(id),
  plan_id uuid not null references app.agent_plans(id),
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  start_date timestamptz not null default now(),
  end_date timestamptz,
  auto_renew boolean not null default false,
  calls_used int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app.agent_subscriptions enable row level security;
create policy agent_isolation on app.agent_subscriptions using (agent_id in (select id from app.agents where agency_id = app.current_agency_id())) with check (agent_id in (select id from app.agents where agency_id = app.current_agency_id()));
create index agent_subs_agent_idx on app.agent_subscriptions(agent_id);
