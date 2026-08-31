-- 0030: Manual bid overrides (client Q2/Q4: pricing adjustable by Campaign, Publisher, Bidding)
-- Admin edits bids manually whenever call volume is low; no schedule. The
-- latest override applies immediately to billing and publisher payouts.

create table if not exists app.bid_overrides (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references app.campaigns(id) unique,
  price_cents int,
  payout_cents int,
  note text,
  created_by uuid references app.memberships(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app.bid_overrides enable row level security;
create policy agency_isolation on app.bid_overrides
  using (campaign_id in (select id from app.campaigns where agency_id = app.current_agency_id()))
  with check (campaign_id in (select id from app.campaigns where agency_id = app.current_agency_id()));

create index if not exists bid_overrides_campaign_idx on app.bid_overrides(campaign_id);
