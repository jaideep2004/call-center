-- 0052: Public contact form inbox.
-- Stores marketing-site contact submissions for staff triage.
-- Append-only: staff flip status (new -> triaged -> closed); rows are never
-- deleted by the app. RLS allow_all mirrors other public-write tables
-- (tutorial_progress, 0049): spam is handled by the per-IP rate limiter
-- in POST /api/v1/public/contact, not by RLS.

create table if not exists app.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text null,
  agency text null,
  call_volume text null,
  inquiry_type text null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'triaged', 'closed')),
  created_at timestamptz not null default now()
);

alter table app.contact_messages enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'allow_all' and tablename = 'contact_messages') then
    create policy allow_all on app.contact_messages using (true) with check (true);
  end if;
end $$;

create index if not exists contact_messages_created_idx
  on app.contact_messages(created_at desc);
