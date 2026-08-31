-- 0013_skills.sql

create table if not exists app.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table app.skills enable row level security;
create policy allow_all on app.skills using (true) with check (true);

create index skills_active_sort_idx on app.skills(active, sort, name);
