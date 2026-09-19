-- 0049: Tutorials plus (P2.2 Ringel-like).
-- Thumbnails, manual ordering, published gate (agents see published only),
-- required flag (v1 = badge only, never blocks Go Live). Watch progress is
-- append-only per user/tutorial (upsert on the pair, history via updated_at).

alter table app.tutorials
  add column if not exists thumbnail_url text null,
  add column if not exists order_index integer not null default 0,
  add column if not exists published boolean not null default false,
  add column if not exists required boolean not null default false;

create table if not exists app.tutorial_progress (
  tutorial_id uuid not null references app.tutorials(id) on delete cascade,
  user_id uuid not null,
  watched_seconds integer not null default 0 check (watched_seconds >= 0),
  watched_percent integer not null default 0 check (watched_percent >= 0 and watched_percent <= 100),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (tutorial_id, user_id)
);

alter table app.tutorial_progress enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'allow_all' and tablename = 'tutorial_progress') then
    create policy allow_all on app.tutorial_progress using (true) with check (true);
  end if;
end $$;

create index if not exists tutorials_published_idx
  on app.tutorials(agency_id, published, order_index) where published = true;
create index if not exists tutorial_progress_user_idx
  on app.tutorial_progress(user_id);
