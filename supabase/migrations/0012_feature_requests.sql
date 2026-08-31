-- 0012_feature_requests.sql

create table if not exists app.feature_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','in_review','planned','in_progress','completed','declined')),
  votes int not null default 0 check (votes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app.feature_requests enable row level security;
create policy allow_all on app.feature_requests using (true) with check (true);

create index feature_requests_status_idx on app.feature_requests(status, votes desc, created_at desc);
