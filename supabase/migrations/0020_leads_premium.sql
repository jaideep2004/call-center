-- #2 Calls in leads: link leads <-> calls, auto-created on qualified disposition
alter table app.leads add column if not exists call_id uuid references app.calls(id) on delete set null;
create index if not exists leads_call_idx on app.leads(call_id);

alter table app.calls add column if not exists lead_id uuid references app.leads(id) on delete set null;
create index if not exists calls_lead_idx on app.calls(lead_id);

-- #6 Annual premium on sold dispositions
alter table app.dispositions add column if not exists annual_premium_cents int check (annual_premium_cents is null or annual_premium_cents > 0);
