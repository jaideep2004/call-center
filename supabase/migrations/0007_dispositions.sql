alter type app.ledger_type add value if not exists 'disposition_payout';

create table if not exists app.dispositions (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references app.calls(id),
  agent_id uuid not null references app.agents(id),
  outcome text not null check (outcome in ('sold','not_interested','no_answer','voicemail','follow_up','disqualified')),
  notes text,
  admin_confirmed boolean not null default false,
  confirmed_by uuid references app.memberships(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_dispositions_call on app.dispositions(call_id);

alter table app.dispositions enable row level security;
create policy agency_isolation on app.dispositions using (call_id in (select id from app.calls where agency_id = app.current_agency_id())) with check (call_id in (select id from app.calls where agency_id = app.current_agency_id()));
create index dispositions_agent_idx on app.dispositions(agent_id, created_at desc);

create table if not exists app.disposition_payouts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references app.agencies(id),
  outcome text not null check (outcome in ('sold','not_interested','no_answer','voicemail','follow_up','disqualified')),
  amount_cents int not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  unique(agency_id, outcome)
);

alter table app.disposition_payouts enable row level security;
create policy agency_isolation on app.disposition_payouts using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
