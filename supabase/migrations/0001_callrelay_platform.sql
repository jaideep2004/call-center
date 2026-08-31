-- Supabase is database/storage only. Better Auth owns public identity tables.
create extension if not exists pgcrypto;
create schema if not exists app;
create schema if not exists jobs;

create type app.role_name as enum ('super_admin','admin','agency','manager','finance','agent');
create type app.call_state as enum ('received','validating','routing','ringing','accepted','connecting','connected','ended','failed','missed','cancelled','disputed');
create type app.ledger_type as enum ('top_up','reserve','release','charge','refund','manual_adjustment','payout');

create table app.agencies (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  status text not null default 'active' check (status in ('pending','active','suspended','closed')),
  currency char(3) not null default 'USD', recording_retention_days int not null default 90 check (recording_retention_days between 1 and 3650),
  created_at timestamptz not null default now()
);
create table app.memberships (
  id uuid primary key default gen_random_uuid(), agency_id uuid not null references app.agencies(id), user_id text not null,
  role app.role_name not null, status text not null default 'active' check (status in ('invited','active','suspended')),
  unique(agency_id,user_id)
);
create table app.agents (
  id uuid primary key default gen_random_uuid(), agency_id uuid not null references app.agencies(id), membership_id uuid not null unique references app.memberships(id),
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected','suspended')),
  availability text not null default 'offline' check (availability in ('offline','available','busy','away')), priority int not null default 100,
  states text[] not null default '{}', zip_prefixes text[] not null default '{}', licenses text[] not null default '{}', skills text[] not null default '{}',
  endpoint_types text[] not null default '{}', last_assigned_at timestamptz
);
create table app.campaigns (
  id uuid primary key default gen_random_uuid(), agency_id uuid not null references app.agencies(id), name text not null, status text not null default 'draft',
  routing_strategy text not null default 'priority' check (routing_strategy in ('priority','round_robin','rtb')),
  price_cents int not null check (price_cents > 0), min_connected_seconds int not null default 60 check (min_connected_seconds >= 0),
  buffer_seconds int not null default 30 check (buffer_seconds >= 0),
  allowed_endpoints text[] not null default '{webrtc,pstn}', target_states text[] not null default '{}', target_zip_prefixes text[] not null default '{}', required_license text, required_skills text[] not null default '{}',
  record_calls boolean not null default true, consent_policy jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table app.phone_numbers (id uuid primary key default gen_random_uuid(), agency_id uuid not null references app.agencies(id), campaign_id uuid not null references app.campaigns(id), provider text not null, e164 text not null unique, status text not null default 'active');
create table app.calls (
  id uuid primary key default gen_random_uuid(), agency_id uuid not null references app.agencies(id), campaign_id uuid not null references app.campaigns(id), agent_id uuid references app.agents(id),
  provider text not null, provider_call_id text not null, state app.call_state not null default 'received', from_hash text, started_at timestamptz, connected_at timestamptz, ended_at timestamptz,
  routing_snapshot jsonb not null default '{}'::jsonb, qualification_snapshot jsonb not null default '{}'::jsonb, unique(provider,provider_call_id)
);
create table app.call_events (id uuid primary key default gen_random_uuid(), agency_id uuid not null references app.agencies(id), call_id uuid not null references app.calls(id), provider text not null, provider_event_id text not null, type text not null, raw_redacted jsonb not null, occurred_at timestamptz not null, created_at timestamptz not null default now(), unique(provider,provider_event_id));
create table app.recordings (id uuid primary key default gen_random_uuid(), agency_id uuid not null references app.agencies(id), call_id uuid not null unique references app.calls(id), storage_path text not null unique, content_type text not null, purge_at timestamptz not null, consent_captured_at timestamptz);
create table app.wallet_entries (id uuid primary key default gen_random_uuid(), agency_id uuid not null references app.agencies(id), type app.ledger_type not null, amount_cents bigint not null check (amount_cents <> 0), currency char(3) not null default 'USD', call_id uuid references app.calls(id), provider_reference text, idempotency_key text not null unique, created_at timestamptz not null default now());
create table app.invoices (id uuid primary key default gen_random_uuid(), agency_id uuid not null references app.agencies(id), call_id uuid unique references app.calls(id), total_cents bigint not null, currency char(3) not null default 'USD', status text not null, created_at timestamptz not null default now());
create table app.leads (id uuid primary key default gen_random_uuid(), agency_id uuid not null references app.agencies(id), email_hash text, phone_hash text, source text, assigned_agent_id uuid references app.agents(id), created_at timestamptz not null default now());
create table app.lead_timeline (id uuid primary key default gen_random_uuid(), agency_id uuid not null references app.agencies(id), lead_id uuid not null references app.leads(id), actor_membership_id uuid references app.memberships(id), type text not null, body jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table app.audit_logs (id uuid primary key default gen_random_uuid(), agency_id uuid references app.agencies(id), actor_user_id text, action text not null, target_type text not null, target_id text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table app.outbox (id uuid primary key default gen_random_uuid(), agency_id uuid references app.agencies(id), topic text not null, payload jsonb not null, occurred_at timestamptz not null default now(), dispatched_at timestamptz);
create table app.affiliates (id uuid primary key default gen_random_uuid(), agent_id uuid not null, code text not null unique, commission_pct int not null default 5 check (commission_pct between 0 and 100), total_earned_cents bigint not null default 0, created_at timestamptz not null default now());

create function app.current_agency_id() returns uuid language sql stable as $$ select nullif(current_setting('app.agency_id', true),'')::uuid $$;
alter table app.agencies enable row level security;
alter table app.memberships enable row level security;
alter table app.agents enable row level security;
alter table app.campaigns enable row level security;
alter table app.phone_numbers enable row level security;
alter table app.calls enable row level security;
alter table app.call_events enable row level security;
alter table app.recordings enable row level security;
alter table app.wallet_entries enable row level security;
alter table app.invoices enable row level security;
alter table app.leads enable row level security;
alter table app.lead_timeline enable row level security;
alter table app.audit_logs enable row level security;
alter table app.outbox enable row level security;
alter table app.affiliates enable row level security;
create policy agency_isolation on app.agents using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create policy agency_isolation on app.campaigns using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create policy agency_isolation on app.phone_numbers using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create policy agency_isolation on app.calls using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create policy agency_isolation on app.call_events using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create policy agency_isolation on app.recordings using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create policy agency_isolation on app.wallet_entries using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create policy agency_isolation on app.invoices using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create policy agency_isolation on app.leads using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create policy agency_isolation on app.lead_timeline using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create policy agency_isolation on app.audit_logs using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create policy agency_isolation on app.outbox using (agency_id = app.current_agency_id()) with check (agency_id = app.current_agency_id());
create policy agency_isolation on app.affiliates using (true) with check (true);

create index calls_agency_state_idx on app.calls(agency_id,state,started_at desc);
create index wallet_agency_created_idx on app.wallet_entries(agency_id,created_at desc);
create index events_call_occurred_idx on app.call_events(call_id,occurred_at);
