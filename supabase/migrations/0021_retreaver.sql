-- 5A: Publisher Retreaver fields
alter table app.publishers add column if not exists fixed_price_cents int check (fixed_price_cents is null or fixed_price_cents > 0);
alter table app.publishers add column if not exists retreaver_status text not null default 'unprovisioned' check (retreaver_status in ('unprovisioned','active','paused','error'));
alter table app.publishers add column if not exists updated_at timestamptz not null default now();

-- 5B: Per-campaign RTB config (single Retreaver account; postback key encrypted at rest)
alter table app.campaigns add column if not exists rtb_enabled boolean not null default false;
alter table app.campaigns add column if not exists rtb_postback_key_encrypted text;

-- 5A: Append-only-ish mirror of Retreaver call records (upserted on unique uuid = latest lifecycle state)
create table if not exists app.retreaver_calls (
  id uuid primary key default gen_random_uuid(),
  uuid text not null unique,
  agency_id uuid not null references app.agencies(id),
  campaign_id uuid references app.campaigns(id),
  publisher_id uuid references app.publishers(id),
  caller text,
  status text,
  connected boolean,
  payout_cents bigint,
  revenue_cents bigint,
  recording_url text,
  tags jsonb not null default '{}'::jsonb,
  raw_redacted jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table app.retreaver_calls enable row level security;
create index retreaver_calls_agency_idx on app.retreaver_calls(agency_id, created_at desc);
create index retreaver_calls_publisher_idx on app.retreaver_calls(publisher_id, created_at desc);

-- 5B: Reservation log + append-only status transitions
create table if not exists app.rtb_reservations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references app.campaigns(id),
  publisher_id uuid references app.publishers(id),
  rtb_uuid text unique,
  caller_number text,
  status text not null default 'reserved' check (status in ('reserved','confirmed','no_target','expired','cancelled')),
  payout_cents bigint,
  inbound_number text,
  sip_address text,
  expires_at timestamptz,
  tags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app.rtb_reservations enable row level security;
create index rtb_reservations_campaign_idx on app.rtb_reservations(campaign_id, created_at desc);

create table if not exists app.rtb_reservation_events (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references app.rtb_reservations(id) on delete cascade,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table app.rtb_reservation_events enable row level security;
create index rtb_reservation_events_idx on app.rtb_reservation_events(reservation_id, created_at);
