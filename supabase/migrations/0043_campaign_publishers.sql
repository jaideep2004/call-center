-- 0043_campaign_publishers.sql
-- Multi-select publishers for campaigns (client requirement: campaigns can have many publishers)
-- Keeps legacy app.campaigns.publisher_id for backward compat (first publisher), but source of truth is this join table.
-- Backfills existing single publisher_id into the join.

create table if not exists app.campaign_publishers (
  campaign_id uuid not null references app.campaigns(id) on delete cascade,
  publisher_id uuid not null references app.publishers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, publisher_id)
);

create index if not exists campaign_publishers_campaign_idx on app.campaign_publishers(campaign_id);
create index if not exists campaign_publishers_publisher_idx on app.campaign_publishers(publisher_id);

alter table app.campaign_publishers enable row level security;
drop policy if exists allow_all on app.campaign_publishers;
create policy allow_all on app.campaign_publishers using (true) with check (true);

-- Backfill: copy existing single publisher_id into join (idempotent)
insert into app.campaign_publishers (campaign_id, publisher_id)
select id, publisher_id from app.campaigns where publisher_id is not null
on conflict (campaign_id, publisher_id) do nothing;
