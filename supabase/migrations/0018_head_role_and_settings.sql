alter table app.agencies add column if not exists head_membership_id uuid references app.memberships(id);

create table if not exists app.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into app.system_settings (key, value) values ('allow_agent_agency_creation', 'false'::jsonb)
on conflict (key) do nothing;
