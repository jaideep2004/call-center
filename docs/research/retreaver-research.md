# Retreaver Core API — Integration Research

> **Status:** RESEARCH ONLY — no code built yet (Aug 2026)
> **Source:** https://retreaver.github.io/core-api-docs/ (Retreaver Core 0.1 API Reference)
> **Purpose:** Future integration for publisher assignment, bidding (RTB), and call routing to publishers.

---

## 1. What Retreaver Actually Is (plain English)

Retreaver is a **pay-per-call marketplace / call-routing exchange**. Three parties:

| Role | Retreaver term (old API) | Modern term | What they do |
|---|---|---|---|
| Call provider | **Affiliate** | **Publisher** | Sends inbound calls (marketing campaigns, SEO, etc.) |
| Call buyer | **Target** | **Buyer** | Answers the calls and pays for them (e.g. insurance agents, call centers) |
| Owner | **Company** | — | Owns the numbers/campaigns, controls routing, takes margin |

Flow:

1. Publisher generates a call (via a tracked phone number, `Retreaver.js`, or RTB).
2. Retreaver routes the call to the best **Target** based on priority/weight/caps/business hours.
3. Call connects; `revenue` (what the buyer pays) vs `payout` (what the publisher earns) is tracked.
4. The Company earns `revenue − payout − cost`.

**For our platform the mapping is:**

- **Our agency/campaign** = Retreaver Company + Campaign (routing config).
- **Our agent / buyer endpoints** = Retreaver **Target** (destination phone number / SIP endpoint that receives the call).
- **Our publishers** (new concept, req #8) = Retreaver **Affiliate** (`afid`).
- **Bidding publishers** (req #4) = Retreaver **RTB** — publisher *asks* Retreaver "who will take this call and how much will you pay" → gets a reservation with payout + target endpoint.

---

## 2. Auth

- All requests: `?api_key=...` (query param) — **never expose client-side**.
- Multi-company: also pass `?company_id=...` (always recommended).
- Base: `https://api.retreaver.com` (Core API) · `https://rtb.retreaver.com` (RTB) · `https://retreaverdata.com` (Call Data Writing).
- JSON or XML via file extension (`/calls.json`). Pagination: 25/page, `Link` header (`rel="next|last"`).
- Errors: `400` bad request · `401` bad key · `403` wrong company · `404` · `429` rate limit · `500/503` retry later.

---

## 3. Nomenclature (old vs new — CRITICAL)

| API object | Old term | Enterprise term | Our mapping |
|---|---|---|---|
| Affiliate | Publisher | Source | **Publisher** (platform `publishers` table) |
| Target | Buyer | Contact Handler / Call Endpoint | **Agent endpoint / buyer** |
| Target Group | Buyer Group | Handler Group | Buyer group (group of targets) |
| Campaign | — | — | Routing config (greeting, timers, IVR menu) |
| Number | — | — | Phone number that receives inbound calls, attached to a Campaign |

Customer-editable IDs: `afid` (affiliate), `tid` (target), `cid` (campaign) — usable in URLs alongside internal `id`.

---

## 4. Key API Surface (endpoints)

### Affiliates (= Publishers) — `api.retreaver.com/api/v1/affiliates[.json]`
- `GET /api/v1/affiliates.json` — list
- `GET /api/v1/affiliates/afid/{afid}.json` — get by customer ID
- `POST /api/v1/affiliates.json` — create `{affiliate: {afid (required), first_name, last_name, company_name}}`
- `PUT /api/v1/affiliates/afid/{afid}.json` — update
- `DELETE /api/v1/affiliates/afid/{afid}.json` — delete (must remove its Numbers first)
- **Call attribution:** a Number is owned by an affiliate via `afid`; call records carry `afid` + `system_affiliate_id`. Timer/postback URLs get macro-replaced: `[affiliate_id]`, `[sub_id]`.

### Targets (= Buyers) — `api.retreaver.com/targets[.json]`
- `GET/POST /targets.json` · `GET/PUT/DELETE /targets/{id}.json` (or `/targets/tid/{tid}`)
- **Key fields:** `number` (E.164 **or** `sip:user@domain`) — required; `name`; `sip_username`/`sip_password`; `client_tid`; `priority` (lowest first); `weight` (same-priority randomization); `timeout_seconds` (default 30); `concurrency_cap`; `paused`; `time_zone`; `business_hours_attributes` (day_of_week 0=Sun, work_day, time_open HHMM, time_close HHMM, inverted; **must pass existing `id` on update**); `tag_list` (`<<<key:value>>>,<<<key:value>>>`).
- **Caps:** `hard_cap_attributes`, `hourly_cap_attributes`, `daily_cap_attributes`, `monthly_cap_attributes` via PUT with `{cap: n}`.
  - Hard cap **never auto-resets** → must call `POST /targets/{id}/reset_cap.json` to refill.
- **Conversions (sale → revenue):** nested `conversion_groups_attributes` on target PUT.
  - `{conversion_groups_attributes: [{name, conversion_type: "timer", conversions_attributes: [{seconds: 90, revenue: 50.0}]}]}`
  - Update: MUST include both group `id` and conversion `id` (omitting them creates duplicates).
  - Delete: `{conversion_groups_attributes: [{id, _destroy: true}]}` — never delete individual conversions.
  - `dedupe_seconds` controls repeat-call suppression.

### Target Groups (= Buyer Groups) — `api.retreaver.com/target_groups[.json]`
- `GET/POST` · `GET/PUT/DELETE /target_groups/{id}.json`
- Fields: `name` (required), `target_ids[]`, `concurrency_cap`, `behavior` (`1`=dial separately, `2`=simuldial), group `priority`/`weight` (behavior 2).
- Membership via PUT: replace all (`target_ids`), add (`add_targets_by_id`), remove (`remove_targets_by_id`).
- Same 4-cap model; group hard cap blocks all targets in group; `POST /target_groups/{id}/reset_cap.json` resets all.

### Campaigns (routing config) — `api.retreaver.com/campaigns[.json]`
- `GET/POST` · `GET/PUT/DELETE /campaigns/cid/{cid}.json`
- Fields: `cid` (your ID), `name`, `record_calls` (default true), `record_seconds`, `dedupe_seconds` (default 0 = off), `affiliate_can_pull_number`, `message` (TTS greeting), `voice_gender`, `message_file`/base64 audio, `timers_attributes` (`seconds` 0=pixel at start, >0=sale timer; `url` with macros), `menu_options_attributes` (`option` button, `target_number`, `target_cid`; option `1` = default routing).
- Campaigns must exist **before** Numbers. Numbers inherit campaign settings unless overridden.

### Numbers / Number Pools
- `GET/POST /numbers.json` · `GET/PUT/DELETE /numbers/{id}.json`
- Create: `type` (Toll-free default | Local), `desired_text` (vanity), `country`, **`afid`** (owner publisher — auto-creates affiliate), **`cid`** (campaign, required), `sid` (sub-ID).
- `number_pools`: dynamic number assignment for `Retreaver.js` click-to-call (params: `cid`, `type`, `country`, `afid`, `max_pool_size` 10, `buffer_seconds`, `reserve_size` 1).

### Real-Time Bidding (RTB) — publisher bids for a buyer — `rtb.retreaver.com`
This is the **core mechanism for req #4 "assign to publishers / bidding publishers / select publishers"**.

**1) Create reservation — `POST https://rtb.retreaver.com/rtbs.json`**
- Required: `key` (RTB Postback Key UUID from the campaign page), `publisher_id`/`source_id` (the publisher this bid is attributed to), `caller_number`.
- Optional: `inbound_number` (static number you own; else RTB returns a **temporary number**), any extra params become `tags` (e.g. `age`, `caller_zip`).
- Response `status: "reserved"`:
  ```json
  {
    "uuid": "c6e4ce37-...",
    "status": "reserved",
    "retreaver_payout": 5.0,
    "retreaver_seconds": 10,
    "inbound_number": "+18772435010",
    "sip_address": "c6e4ce37-...@sip.rtb.retreaver.com",
    "expires_at": "2024-10-28T12:08:49.880Z"
  }
  ```
- Reservation is **not** counted against buyer caps yet; expires after a limited time.

**2) Confirm reservation — `PUT/PATCH https://rtb.retreaver.com/rtbs/{uuid}.json`**
- Body: `{"key": "...", "status": "confirmed"}`
- Response either `status: "confirmed"` (counts against caps; publisher is now expected to dial) or `status: "no-target"` (caps filled meanwhile — check always).
- Failure to dial after confirm → penalties for the publisher.

**3) Ping Shield** — repeated RTB requests for the same `caller_number` before expiry return the **cached first response** (`"retreaver_ping_shield": true`) instead of re-pinging buyers.

### Call Data Writing — publishers tag callers — `retreaverdata.com` (NOT api.retreaver.com)
- `POST/GET https://retreaverdata.com/data_writing` with `key` (postback UUID), `caller_number` **or** `call_uuid`, plus arbitrary `key=value` tags.
- Behavior: call not found → tags stored, applied on next call from that number ("call not found, tags stored"); completed call → applied; in-progress → applied at next routing decision or call end.
- **Use case:** publishers push premium info / lead data onto calls before routing.

### Call records — `api.retreaver.com/api/v1/calls[.json]` (V1–V4)
- Fields of interest: `uuid`, `caller`, `caller_zip/state/city/country`, `dialed_number`, `total_duration`/`dialed_call_duration`/`ivr_duration`/`hold_duration`, `status` (`finished`…), `cid`/`afid`/`sid`, `revenue`, `payout`, `postback_value`, `converted`, `payable`, `receivable`, `hung_up_by`, `duplicate`, `tags` (map), `fired_pixels[]`, `recording_url`, `connected`, `target_id`/`target_name`, `campaign_id`/`campaign_name`, `number`, `profit_gross`, `profit_net`, `billable_minutes`, `time_to_connect_in_seconds`.
- V3: `number` becomes object `{number, name}`. V4: `campaign_id` becomes object `{id, name}`.
- Filters: `company_id`, `created_at_start/end`, `sort_by` (created_at|updated_at), `order`, `caller`, `client_afid`, `client_cid`, `client_tid`, `sub_id`, `call_flow_events` (V2+).
- **Sync strategy (docs recommendation):** poll every ~10 min for updated calls (batch), **plus webhooks for real-time** (push at call end). A single call record updates multiple times through its lifecycle.

### Reports — `api.retreaver.com/api/v1/reports.json`
- Params: `domain=calls` (only), `facet` ∈ publisher|buyer|campaign|number|daily|tag_value|state, `created_at_start/end` (≤2 years apart), `per_page`, `tag_value_key`.
- `facet=buyer` → in-progress counts per buyer (cached — **not for realtime polling**).
- `facet=tag_value` → per-tag metrics (total_calls, repeat_count, converted_count, revenue, payout, cost, profit, epc, cpc…). Only **explicitly created** tags are indexed.

---

## 5. What We Need It For (req #4, #8 mapping)

| Platform requirement | Retreaver mechanism |
|---|---|
| Assign calls to publishers | Publisher = **Affiliate** (`afid`); attribution via Number ownership or RTB `publisher_id` |
| Bidding publishers / select publishers | **RTB reservations** (`rtb.retreaver.com/rtbs.json`): post request per inbound call → get payout + endpoint (PSTN `inbound_number` or dynamic `sip_address`) → confirm before dial |
| Our agents as buyers | **Targets** (E.164 or `sip:user@domain`), with `priority`/`weight`/`timeout_seconds`/`concurrency_cap`/business hours; groups via **Target Groups** |
| Per-sale revenue tracking | **Conversion groups** on Targets (`seconds` + `revenue` → `converted: true`, `revenue` on call) |
| Publishers push lead data onto calls | **Call Data Writing** (`retreaverdata.com/data_writing`) |
| Admin sees marketplace economics | **Reports** API (buyer/publisher/tag_value facets) + Calls V2+ payload (`revenue`, `payout`, `profit_gross/net`) |
| Client (campaign) routing config | **Campaigns** (greeting, timers, menu options) + **Numbers** attached to campaign |

## 6. Proposed Future Architecture (NOT built yet)

```
┌────────────────────────────────────────────────────────────┐
│ Our platform                                              │
│  publishers table (afid, name, contact, commission)        │
│  campaigns.publisher_id (req #8)                           │
│  campaign → Retreaver campaign + number (1:1 sync)         │
│  agent/agency → Retreaver target (sip endpoint)            │
└───────────────┬────────────────────────────────────────────┘
                │ adapter (isolated behind interface, per AGENTS.md)
                ▼
┌────────────────────────────────────────────────────────────┐
│ Retreaver Core API  (api.retreaver.com)                    │
│  POST /rtbs.json  → reservation (payout, endpoint)         │
│  PUT  /rtbs/{id}  → confirm (caps applied)                 │
│  Targets/Groups/Conversions CRUD                           │
│  Webhooks (push) + 10-min poll (pull)                      │
└────────────────────────────────────────────────────────────┘
```

Design constraints (from AGENTS.md):
- External provider behind an **adapter** (`src/domain/providers/` pattern, like Telnyx).
- Webhooks validated + idempotent; sync jobs queued (pg-boss) — never blocking request chain.
- Never store the Retreaver API key unencrypted; server-side only.
- Append-only records for payouts/bids (reservation log table with status transitions).

## 7. Decisions (client-confirmed) & Open Questions

**Decisions (Aug 2026):**

| Q | Decision |
|---|---|
| 2. Payout model | **Fixed price per call.** Publishers placed in an RTB with a fixed price per publisher. We are the buyer; revenue = campaign `price_cents`; margin = price − payout. |
| 3. Publisher management | **Manual/API from admin.** No self-service portal now; possible later. |
| 4. Accounts | **Single Retreaver account for the whole platform.** One `api_key` + `company_id`. Per-campaign RTB Postback Keys stored encrypted on `campaigns`. |
| 1. Numbers | 🔒 **Pending client confirmation** — rent Retreaver numbers vs route to existing Telnyx numbers. Architecture supports both (Phase 5B of `docs/PHASE_PLAN.md` blocked until answered). |

**Credentials required (recap):** `RETREAVER_API_KEY`, `RETREAVER_COMPANY_ID` (env, server-only), per-campaign RTB Postback Key (UUID, encrypted in DB). 🔒 Verify webhook signing method at build time.

Full integration plan: **`docs/PHASE_PLAN.md`** → Phase 5A + 5B (ingestion, publishers, RTB/bidding) **DONE** (Aug 2026).
