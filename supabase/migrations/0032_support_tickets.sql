-- 0032: Support tickets (lifecycle #30)

create table if not exists app.support_tickets (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references app.agencies(id),
  requester_membership_id uuid not null references app.memberships(id),
  assignee_membership_id uuid references app.memberships(id),
  subject text not null check (char_length(subject) between 1 and 255),
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app.support_tickets enable row level security;
create policy agency_isolation on app.support_tickets using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create index if not exists support_tickets_agency_status_idx on app.support_tickets(agency_id, status, created_at desc);

create table if not exists app.support_ticket_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references app.support_tickets(id) on delete cascade,
  author_membership_id uuid not null references app.memberships(id),
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now()
);

alter table app.support_ticket_replies enable row level security;
create policy agency_isolation on app.support_ticket_replies using (ticket_id in (select id from app.support_tickets where agency_id = app.current_agency_id())) with check (ticket_id in (select id from app.support_tickets where agency_id = app.current_agency_id()));
create index if not exists support_replies_ticket_idx on app.support_ticket_replies(ticket_id, created_at asc);
