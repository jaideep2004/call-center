alter table app.agencies add column if not exists parent_agency_id uuid references app.agencies(id);
alter table app.agencies add column if not exists commission_rate int not null default 0 check (commission_rate between 0 and 100);
create index if not exists agencies_parent_idx on app.agencies(parent_agency_id);

create table if not exists app.recruitment_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_membership_id uuid not null references app.memberships(id),
  invitee_email text not null,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','expired')),
  sub_agency_id uuid references app.agencies(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);

alter table app.recruitment_invites enable row level security;
create policy agency_isolation on app.recruitment_invites using (inviter_membership_id in (select id from app.memberships where agency_id = app.current_agency_id())) with check (inviter_membership_id in (select id from app.memberships where agency_id = app.current_agency_id()));
create index invites_token_idx on app.recruitment_invites(token);
create index invites_inviter_idx on app.recruitment_invites(inviter_membership_id);
