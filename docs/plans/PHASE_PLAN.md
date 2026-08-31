# Coverage Calls — 16-Requirement Build Plan

Plan covering the client's 16 feature requests, executed phase by phase.

- **Phase 0–4: COMPLETE** (typecheck clean, tests passing, graph updated)
- Migrations 0011–0020 must be applied to Supabase before Phase 4 work is tested live.
- Retreaver: research done (`docs/retreaver-research.md`); implementation planned in Phase 5 below.

---

## Phase 0 — Quick wins & data fixes ✅ DONE

| # | Item | Approach |
|---|------|----------|
| 5 | Disposition rename | Migration `0011_disposition_statuses.sql`: update `app.dispositions.outcome` CHECK + `app.disposition_payouts` CHECK → `dead_call` (renamed from `voicemail`) + new `dead_air`. Data migration: `UPDATE dispositions SET outcome='dead_call' WHERE outcome='voicemail'`. Centralize outcomes in `src/server/constants.ts` — previously in validate.ts:154, calls/[id]/page.tsx:48, admin page — all 3 replaced. Update disposition form + labels. |
| 9 | Nationwide | Remove `zip_prefixes` inputs from agent forms + `target_zip_prefixes` from campaign targeting; routing (`src/domain/routing.ts`) skips zip check (nationwide). Keep columns nullable for future. |
| 15 | Feature requests | New table `app.feature_requests` (title, description, status, user_id, votes, created_at) + repo + API + page + nav item. Simple CRUD, admin triage view. |

## Phase 1 — Skills & scripts (content management) ✅ DONE

| # | Item | Approach |
|---|------|----------|
| 1 | Admin-managed skills | New table `app.skills` (name unique, slug, active, sort). Admin CRUD page + API (`/api/v1/skills`, `skills:manage` perm). Replace all 4 hardcoded SKILL_OPTIONS arrays with API-fetched list (agents/new, agents/[id], admin/agents/new, campaigns/[id]). Server-side validation of skills against DB. Routing reads skills from DB as today. |
| 10 | Dynamic client scripts | Add `campaign_id` (nullable FK) to `app.scripts` + template variables ({{agent_name}}, {{phone}}, {{npn}}, {{state}}, {{beneficiary}}…) resolved at render. Admin assigns script per campaign. Softphone/take-calls gets a script panel during an active call showing the campaign's script with variables filled from the agent profile. |

## Phase 2 — Campaigns (publisher, price, assignment) ✅ DONE

| # | Item | Approach |
|---|------|----------|
| 11 | Editable price | Convert the read-only Price row in `campaigns/[id]/page.tsx:248` into an input (like min-connect/buffer). Also add skills multi-select from DB (replaces inline hardcoded array at line 466). |
| 8 | Publishers in campaigns | New table `app.publishers` (name, email, afid nullable → maps to Retreaver affiliate later, commission %, active) + admin CRUD + `campaigns.publisher_id` FK. Shown in campaign add/edit. Retreaver-specific publisher fields (`fixed_price_cents`, provisioning) are added in Phase 5A. |
| 7+16 | Assignment: campaigns → agency/agents | New table `app.campaign_assignments` (campaign_id, agency_id nullable, agent_id nullable, assigned_by, created_at). Admin assigns a campaign to an agency (all its agents) or specific agents — on campaign page + dedicated assignment UI. Routing only considers calls for campaigns assigned to the agent's agency or to that agent directly. Agency head picks which campaigns their agents work (view of assigned campaigns). |
| 7+13+14 | Agency creation by agents + head role | Add `agencies.head_membership_id` (owner/head). New system setting `allow_agent_agency_creation` (admin toggle, #14) gating the "Create Agency" flow for agents. When head creates agency → becomes head member; head manages members (#13) via the existing membership UI (grant `users:manage`/`agency:manage` to head within own agency). New role `agency_head`? — decision: reuse existing roles + `head_membership_id` flag, simpler and avoids enum migration. |

## Phase 3 — Wallet transfers ✅ DONE

| # | Item | Approach |
|---|------|----------|
| 12 | Agency → agent balance transfer | Append-only `app.wallet_transfers` (0019: from_membership, from_agency, to_agent, amount_cents > 0, reason, created_at) + `ledger_type` value `transfer` (via `alter type ... add value if not exists`). Transactional `walletTransfers.transferToAgent`: verifies agent belongs to agency + sufficient agency balance (agency-only entries), inserts transfer row, then agency entry `-amount` + agent entry `+amount` (idempotency keys `transfer_<id>_out/_in`). `LedgerType` union gained `disposition_payout` (latent fix) + `transfer`. API: `POST /api/v1/wallet/transfer` (wallet:manage), `GET /api/v1/wallet/transfers`, `GET /api/v1/wallet/agents` (performance panel: earnings, calls, talk time per agent). UI: wallet page — agent performance table + per-agent transfer form (amount, notes), balance-aware. Audit trail preserved — no updates/deletes. |

## Phase 4 — Leads, premium, exports ✅ DONE

| # | Item | Approach |
|---|------|----------|
| 2 | Calls in leads | Migration `0020`: `leads.call_id` FK + `calls.lead_id` FK + indexes. On qualified disposition (`sold`/`follow_up` — `QUALIFIED_OUTCOMES` in constants) the disposition route now creates/updates the lead **atomically in the same transaction**: upsert by `phone_hash` per agency (status upgrade-only via rank: new→contacted→qualified→converted), source = campaign id, agent = call agent, timeline event `lead.created`, `calls.lead_id` linked, `leads.call_id` kept as first call. *Note: deviated from "queued via pg-boss" — lead creation is 3 light queries and the worker isn't running in dev (dev.js only spawns gateway + Next); synchronous transactional creation is reliable and retry-safe (disposition unique per call). Revisit queue if volume demands.* Leads list (`findManyWithFilters`) LEFT JOINs the originating call + disposition → new columns: Last Call, Duration, Disposition, Premium. Lead detail gains a Call History card (`GET /api/v1/leads/[id]/calls` — all calls matching `from_hash`, with disposition + premium). |
| 6 | Annual premium on sold | `dispositions.annual_premium_cents` (nullable, check > 0) in `0020`. `createDispositionSchema` superRefine: required when `outcome=sold`, rejected otherwise. Call detail disposition form shows the premium input only when Sold; displayed on call detail, lead detail, lead list, and both exports. |
| 3 | Export CSV/PDF | Added `exceljs` (actively maintained; avoided stale SheetJS). New `src/lib/excel.ts` (`toExcelBuffer` — bold frozen header row). `GET /api/v1/leads/export` and `/api/v1/calls/export` accept `?format=csv|xlsx` (default csv); xlsx returns proper `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. Both exports now pass **all active filters through** (leads: search/status/source/agent/dates; calls: state/search) and include duration, disposition outcome, and annual premium columns. Leads + calls list pages got CSV + Excel buttons. FAQ copy fixed: CSV/Excel claim corrected (no PDF), ZIP removed (nationwide), Retreaver + S3 claims made factual. |

## Phase 5 — Retreaver integration (publisher marketplace + RTB bidding)

> Status: **DONE** (backend + admin UI built and verified — 196 tests, typecheck clean; migration `0021_retreaver.sql` must be applied to Supabase before deploy).
> Client decisions (confirmed): **fixed price per call** (not per-sale) → publishers run in an RTB with a **fixed price per publisher**; **publishers managed manually** (self-service portal is future work); **one Retreaver account for the whole platform** (`api_key` + `company_id` in env, RTB postback keys per campaign).
> Q1 answered: **route to existing Telnyx numbers** — Retreaver is the acquisition/marketplace layer, Telnyx remains the call-control layer (targets = our Telnyx campaign numbers → existing orchestrator + softphone unchanged). No rented numbers, no call bridging.
> Env vars added: `RETREAVER_API_KEY`, `RETREAVER_COMPANY_ID`, `RETREAVER_WEBHOOK_SECRET` (secret token in the webhook URL), `ENCRYPTION_KEY` (AES-256-GCM for campaign postback keys).

### 5.0 Pre-build verification (gate)

- Verified against current Retreaver docs (Aug 2026): webhooks have **no HMAC/signature** — the configured webhook URL itself is the auth mechanism → endpoint carries a server-side `token` query param (env `RETREAVER_WEBHOOK_SECRET`). Affiliates API (`/api/v1/affiliates.json`, `afid` in body), Calls V2 (`/api/v2/calls.json`, Link-header pagination), RTB (`rtb.retreaver.com/rtbs.json` reserve + PUT confirm, `no_target` status, ping shield), Call Data Writing (`retreaverdata.com/data_writing`) — all current.
- Q1 confirmed with client: route to existing Telnyx numbers.

### 5A — Publisher management & Retreaver data layer

| # | Item | Approach |
|---|------|----------|
| 8A | Publishers → Retreaver | ✅ `app.publishers` extended: `fixed_price_cents` (per-call payout, > 0), `retreaver_status` (unprovisioned/active/paused/error), `updated_at`. `src/server/services/retreaver.ts` `provisionPublisher()` — creates the Retreaver affiliate with `afid` = publisher id (join key), re-provisioning updates the affiliate; status flips to `error` on failure. Pause/Resume via PATCH (activation blocked before provisioning). API: `POST /api/v1/retreaver/provision`. |
| 4A | Retreaver adapter | ✅ `src/domain/providers/retreaver.ts` — isolated adapter (same pattern as `telnyx.ts`): REST client (`api_key` + `company_id` query params, server-only), affiliate CRUD, calls fetch (V2, Link pagination, `updated_at_start`/`created_at_start`), RTB client, call-data writing, `RetreaverError`, `hashPhone`. Env: `RETREAVER_API_KEY`, `RETREAVER_COMPANY_ID`. |
| 4B | Call records ingestion | ✅ `app.retreaver_calls` (uuid unique, idempotent upsert, agency/campaign/publisher FKs, payout/revenue cents, status, connected, recording_url, tags, raw_redacted, synced_at). Webhook route `/api/webhooks/retreaver` (token-validated per 5.0, idempotent on unique uuid, status transitions only, never blocks) **plus** 10-min poll sync job (`sync-retreaver-calls`, pg-boss, retry-safe, 5-min overlap window) as backstop. Manual trigger: `POST /api/v1/retreaver/sync`. Attribution: dialed_number → `app.phone_numbers.e164` → campaign/agency; afid → publisher. |
| 4C | Admin UI + reports | ✅ Admin Publishers page: create with fixed price, Provision/Pause/Resume/Retry buttons, Retreaver status badge, manual Sync button, Retreaver performance report (calls / connected / payout / campaign revenue / margin per publisher + totals via `GET /api/v1/retreaver/report`). |

### 5B — RTB bidding flow (fixed price per publisher)

| # | Item | Approach |
|---|------|----------|
| 4D | RTB reservations | ✅ `app.rtb_reservations` (status reserved/confirmed/no_target/expired/cancelled, payout_cents, inbound_number, sip_address, expires_at, tags) + append-only `app.rtb_reservation_events` (every transition logged). `src/server/services/retreaver-rtb.ts`: `reserveRtbReservation` (POST rtbs.json → row + event; `no_target` recorded) → `confirmRtbReservation` (PUT, `confirmed`/`no_target`) → `expireStaleRtbReservations` (5-min pg-boss job). APIs: `POST/GET /api/v1/retreaver/reservations`, `POST .../[id]/confirm`. Campaign postback keys stored **encrypted** (AES-256-GCM via `src/server/crypto.ts`, `ENCRYPTION_KEY`), decrypted at use-time; set via `PATCH /api/v1/campaigns/[id]` (`rtb_postback_key` → `rtb_postback_key_encrypted`). |
| 4E | Fixed-price wiring | ✅ Reservation request includes `publisher_id` (Retreaver afid), `caller_number`, `inbound_number` (campaign's Telnyx number), tags; expected `payout_cents` = publisher `fixed_price_cents` stored on the reservation. |
| 4F | Call flow integration | ✅ RTB section on campaign detail page (enable toggle + encrypted postback key entry). Publisher call → RTB reservation → inbound number (ours) → Telnyx target endpoint → **existing orchestrator/softphone unchanged**. Retreaver call push/sync → `retreaver_calls` → margin report (campaign price − payout). Accounting is record-only for now. |

### 5C — Publisher postbacks & portal

| # | Item | Approach |
|---|------|----------|
| 8B | Publisher postbacks | Optional postback notifications to publishers on call outcome (timer URLs with `[affiliate_id]`/`[sub_id]` macros). Not built until publishers request it. |
| 8C | Publisher self-service portal | ✅ **DONE** — invite-based portal (migration `0022_publisher_portal.sql` applied). Admin → Publishers → **Invite** generates a 7-day link (`/register?invite=<token>`); publisher signs up, invite accept sets `user.role = 'publisher'` + links `publishers.user_id` (text FK to `"user"(id)` — better-auth ids are text). Portal at `/dashboard/publisher` (Overview / Campaigns / Calls) with amber accent theme; role `publisher` + resource `publisher-portal` added to permission matrix. Data scoped to the linked publisher only: finished calls, qualified (payout > 0), per-campaign breakdown, payout totals. Client decided publishers get **Retreaver dashboard access instead** (manual account creation in Retreaver portal — Core API cannot create logins); our portal remains available as fallback. |


