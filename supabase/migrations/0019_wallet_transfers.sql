alter type app.ledger_type add value if not exists 'transfer';

create table if not exists app.wallet_transfers (
  id uuid primary key default gen_random_uuid(),
  from_membership_id uuid not null references app.memberships(id),
  from_agency_id uuid not null references app.agencies(id),
  to_agent_id uuid not null references app.agents(id),
  amount_cents bigint not null check (amount_cents > 0),
  reason text,
  created_at timestamptz not null default now()
);

create index wallet_transfers_agency_idx on app.wallet_transfers(from_agency_id, created_at desc);
create index wallet_transfers_agent_idx on app.wallet_transfers(to_agent_id, created_at desc);
