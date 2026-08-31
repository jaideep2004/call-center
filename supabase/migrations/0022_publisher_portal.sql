-- 0022: Publisher portal — link publisher accounts to app users + invite flow

alter table app.publishers add column if not exists user_id text references "user"(id);
create unique index if not exists publishers_user_id_unique on app.publishers(user_id) where user_id is not null;

create table if not exists app.publisher_invites (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references app.publishers(id),
  email text not null,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);

alter table app.publisher_invites enable row level security;
create policy platform_managed on app.publisher_invites using (true) with check (true);
create index if not exists publisher_invites_token_idx on app.publisher_invites(token);
create index if not exists publisher_invites_publisher_idx on app.publisher_invites(publisher_id);
                                         