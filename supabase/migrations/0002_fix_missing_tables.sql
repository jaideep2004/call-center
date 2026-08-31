-- Add role column to public.user for Better Auth additionalFields sync
alter table "user" add column if not exists role text;

-- Create app.affiliates table (was missing from 0001)
create table if not exists app.affiliates (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null,
  code text not null unique,
  commission_pct int not null default 5 check (commission_pct between 0 and 100),
  total_earned_cents bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table app.affiliates enable row level security;
create policy agency_isolation on app.affiliates using (true) with check (true);
