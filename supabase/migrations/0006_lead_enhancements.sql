alter table app.leads add column if not exists deleted_at timestamptz;
alter table app.leads add column if not exists updated_at timestamptz not null default now();
alter table app.leads add column if not exists status text not null default 'new' check (status in ('new','contacted','qualified','converted','lost','disqualified'));

create table if not exists app.lead_tags (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references app.agencies(id),
  lead_id uuid not null references app.leads(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique (lead_id, tag)
);

alter table app.lead_tags enable row level security;
create policy agency_isolation on app.lead_tags using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());

create table if not exists app.lead_notes (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references app.agencies(id),
  lead_id uuid not null references app.leads(id) on delete cascade,
  content text not null,
  author_membership_id uuid references app.memberships(id),
  created_at timestamptz not null default now()
);

alter table app.lead_notes enable row level security;
create policy agency_isolation on app.lead_notes using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create index lead_notes_lead_idx on app.lead_notes(lead_id, created_at desc);
