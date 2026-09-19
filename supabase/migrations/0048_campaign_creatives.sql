-- 0048: Campaign creatives (P2.1 CMS ads).
-- Campaign-linked ads for agent dashboard slots. campaign_id NULL = global
-- (every agent sees it, per client choice). Placement is agent_hero (top
-- carousel, max 3) or agent_feed (list below Quick Actions). Active window
-- via starts_at/ends_at; soft-delete preserves history.

create table if not exists app.campaign_creatives (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references app.agencies(id) on delete cascade,
  campaign_id uuid null references app.campaigns(id) on delete cascade,
  type text not null check (type in ('image', 'video')),
  title text not null,
  media_url text not null,
  thumbnail_url text null,
  cta_label text null,
  cta_href text null,
  placement text not null default 'agent_feed' check (placement in ('agent_hero', 'agent_feed')),
  priority integer not null default 0,
  active boolean not null default true,
  starts_at timestamptz null,
  ends_at timestamptz null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app.campaign_creatives enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'allow_all' and tablename = 'campaign_creatives') then
    create policy allow_all on app.campaign_creatives using (true) with check (true);
  end if;
end $$;

create index if not exists campaign_creatives_agency_idx
  on app.campaign_creatives(agency_id) where deleted_at is null;
create index if not exists campaign_creatives_placement_idx
  on app.campaign_creatives(agency_id, placement, priority desc) where deleted_at is null and active = true;
create index if not exists campaign_creatives_campaign_idx
  on app.campaign_creatives(campaign_id) where deleted_at is null;
