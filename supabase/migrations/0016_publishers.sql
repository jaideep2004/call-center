create table if not exists app.publishers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  afid text unique,
  commission_pct int not null default 0 check (commission_pct between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table app.publishers enable row level security;
drop policy if exists platform_managed on app.publishers;
create policy platform_managed on app.publishers using (true) with check (true);
create index publishers_active_idx on app.publishers(active, name);

alter table app.campaigns add column if not exists publisher_id uuid references app.publishers(id);
