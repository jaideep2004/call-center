create table if not exists app.payments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references app.agencies(id),
  stripe_session_id text not null unique,
  stripe_payment_intent_id text unique,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd',
  status text not null default 'pending' check (status in ('pending','completed','failed','refunded')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table app.payments enable row level security;
create policy agency_isolation on app.payments using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create index payments_agency_idx on app.payments(agency_id, created_at desc);
