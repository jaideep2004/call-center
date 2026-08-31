-- 0031: Agent fees (Dialer Fee / Software Access) + weekly invoices (client Q3/Q5/Q6)

alter table app.agents add column if not exists software_fee_cents int not null default 5000;

create table if not exists app.agent_fees (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references app.agents(id),
  agency_id uuid not null references app.agencies(id),
  kind text not null check (kind in ('dialer','software')),
  amount_cents int not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending','charged','waived','failed')),
  due_date date not null,
  invoice_id uuid references app.invoices(id),
  charged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id, kind, due_date)
);

alter table app.agent_fees enable row level security;
create policy agency_isolation on app.agent_fees using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());

create index if not exists agent_fees_agent_due_idx on app.agent_fees(agent_id, due_date desc);
create index if not exists agent_fees_agency_status_idx on app.agent_fees(agency_id, status);
