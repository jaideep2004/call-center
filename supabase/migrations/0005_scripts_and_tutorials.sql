create table if not exists app.scripts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references app.agencies(id),
  title text not null,
  content text not null,
  category text not null default 'general',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app.scripts enable row level security;
create policy agency_isolation on app.scripts using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create index scripts_agency_idx on app.scripts(agency_id, created_at desc);

create table if not exists app.tutorials (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references app.agencies(id),
  title text not null,
  content text not null,
  category text not null default 'general',
  video_url text,
  duration_seconds int,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app.tutorials enable row level security;
create policy agency_isolation on app.tutorials using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create index tutorials_agency_idx on app.tutorials(agency_id, created_at desc);
