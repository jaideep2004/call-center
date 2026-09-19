-- 0046: Dual wallets (P1.4 marketplace).
-- Agency pool funds agent allocations: effective agent balance = personal
-- wallet_entries sum + allocation. Pool starts at 0 — top-ups arrive ONLY via
-- Stripe webhook (never minted); allocations only move WITHIN the pool balance.

create table if not exists app.agency_wallets (
  agency_id uuid primary key references app.agencies(id) on delete cascade,
  balance_cents integer not null default 0 check (balance_cents >= 0),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists app.agency_wallet_allocations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references app.agencies(id) on delete cascade,
  agent_id uuid not null references app.agents(id) on delete cascade,
  allocated_cents integer not null default 0 check (allocated_cents >= 0),
  updated_at timestamptz not null default now(),
  unique (agency_id, agent_id)
);

alter table app.agency_wallets enable row level security;
alter table app.agency_wallet_allocations enable row level security;

-- platform-managed: service role enforces agency scoping in code (same as 0045).
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'allow_all' and tablename = 'agency_wallets') then
    create policy allow_all on app.agency_wallets using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'allow_all' and tablename = 'agency_wallet_allocations') then
    create policy allow_all on app.agency_wallet_allocations using (true) with check (true);
  end if;
end $$;

create index if not exists agency_wallet_allocations_agent_idx
  on app.agency_wallet_allocations(agent_id);
create index if not exists agency_wallet_allocations_agency_idx
  on app.agency_wallet_allocations(agency_id);
