-- 0027: Public-lead dedupe/race hardening + missing RLS policies for retreaver tables

-- S5: race-safe dedupe for public (agency-less) leads + indexed lookups
create unique index if not exists leads_public_email_uq on app.leads(email_hash) where agency_id is null;
create unique index if not exists leads_public_phone_uq on app.leads(phone_hash) where agency_id is null;
create index if not exists leads_email_hash_idx on app.leads(email_hash) where email_hash is not null;
create index if not exists leads_phone_hash_idx on app.leads(phone_hash) where phone_hash is not null;

-- S7: migration 0021 enabled RLS on the retreaver tables but never created
-- policies, leaving them default-deny. Mirror the agency_isolation pattern so
-- the tables behave consistently with the rest of the schema regardless of the
-- connection role. (Under service-role access these are inert; they matter if
-- the app ever connects as an RLS-respecting role.)
-- NOTE: CREATE POLICY IF NOT EXISTS needs PG 15+; use a portable DO block so
-- this migration also runs on PG 14 (and re-runs safely everywhere).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'app' and tablename = 'retreaver_calls' and policyname = 'agency_isolation'
  ) then
    execute 'create policy agency_isolation on app.retreaver_calls
             using (agency_id = app.current_agency_id())
             with check (agency_id = app.current_agency_id())';
  end if;
end $$;

-- RTB reservations/events are short-lived operational rows; a permissive
-- policy matches the current service-role posture while keeping RLS enabled.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'app' and tablename = 'rtb_reservations' and policyname = 'allow_all'
  ) then
    execute 'create policy allow_all on app.rtb_reservations using (true) with check (true)';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'app' and tablename = 'rtb_reservation_events' and policyname = 'allow_all'
  ) then
    execute 'create policy allow_all on app.rtb_reservation_events using (true) with check (true)';
  end if;
end $$;
