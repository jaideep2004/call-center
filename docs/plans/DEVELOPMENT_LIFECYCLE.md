# CallRelay — Development Lifecycle

## Design Reference
Primary inspiration: **Ringelo** (https://os.ringelo.com/dashboard/) — dashboard layout, take-calls workflow, agent availability toggles, call disposition flow, and wallet/credits model.

---

## Phase 1 — Core Telephony & Billing Cycle

| # | Task | Status |
|---|------|--------|
| 1 | Stripe payment integration — Checkout page, Stripe webhook, wallet top-up API | ✅ |
| 2 | Post-call billing orchestrator — `finalizeCall` calculates cost (with buffer/min charge), deducts from wallet after balance check, creates paid invoice; `min_connected_seconds` respected; idempotent wallet inserts with `ON CONFLICT` | ✅ |
| 3 | Recording management — Telnyx-based recordings API (list/get/delete), audio player on call detail, **download endpoint**, **delete button in UI**, **dedicated recordings list page** | ✅ |

## Phase 2 — Agent Experience

| # | Task | Status |
|---|------|--------|
| 4 | Agent softphone UI — WebRTC-based call accept/reject/connect/disconnect, ringing notification | ✅ |
| 5 | Agent earnings report — Per-agent earnings page + API with date range filter | ✅ |
| 6 | Scripts & Tutorials — `app.scripts` + `app.tutorials` tables, CRUD APIs, agent-facing pages | ✅ |
| 7 | **Go Online/Offline toggle** — Sidebar availability toggle, dedicated `/dashboard/take-calls` page with status badge + toggle + recent call history | ✅ |

## Phase 3 — Call Disposition & Performance-Based Earnings (NEW — Client Priority)

| # | Task | Status |
|---|------|--------|
| 8 | **Disposition schema** — `app.dispositions` + `app.disposition_payouts` tables, migration 0007, `app.ledger_type` extended with `disposition_payout` | ✅ |
| 9 | **Disposition UI** — After-call form on call detail page (outcome dropdown + notes + submit). Admin review page at `/dashboard/admin/dispositions` with confirm button per row. Sidebar nav link for admin | ✅ |
| 10 | **Disposition API** — `POST /api/v1/calls/[id]/disposition` (agent submits), `PATCH /api/v1/dispositions/[id]/confirm` (admin confirms + credits wallet), `GET /api/v1/dispositions?status=pending` (admin review), `GET/PUT /api/v1/disposition-payouts` (configure payout per outcome) | ✅ |
| 11 | **Performance-based earnings** — `finalizeCall` checks for confirmed disposition first: uses payout amount (credit) instead of per-second charge. Confirm endpoint upserts invoice as "paid" + creates `disposition_payout` wallet entry with idempotency key. Fallback to per-second when no disposition exists | ✅ |

## Phase 4 — Reporting & Export

| # | Task | Status |
|---|------|--------|
| 12 | CSV/Excel export — Download buttons on calls, leads, reports pages (server-side csv generation) | ✅ |
| 13 | Conversion rate + avg duration reports — New API endpoints + charts on reports page | ✅ |
| 14 | Top performers page — Agent leaderboard with call count, revenue, conversion | ✅ |

## Phase 5 — Lead Management Enhancements

| # | Task | Status |
|---|------|--------|
| 15 | Lead tags & notes — Tags table + notes table, UI on lead detail | ✅ |
| 16 | Lead assign UI — Inline assign dropdown on leads list | ✅ |
| 17 | Lead delete — Soft-delete endpoint + delete button | ✅ |
| 18 | Lead filters — Date range, source, status, assigned agent filters | ✅ |
| 19 | Lead timeline — Full timeline component on lead detail | ✅ |

## Phase 6 — CMS & Content Management

| # | Task | Status |
|---|------|--------|
| 20 | CMS admin panel — CRUD for homepage sections, FAQ, testimonials, privacy, terms | ⏳ |
| 21 | Dynamic content rendering — Public pages read from DB instead of hardcoded | ⏳ |

## Phase 7 — Agent Subscriptions & Credits

| # | Task | Status |
|---|------|--------|
| 22 | **Subscription plans table** — `app.agent_plans` (name, price_cents, call_allowance, features, active), migrated in 0008. CRUD API + admin management page at `/dashboard/admin/plans` | ✅ |
| 23 | **Agent subscriptions** — `app.agent_subscriptions` (agent_id, plan_id, status, calls_used, start/end_date). Subscribe/cancel API. Agent subscription page at `/dashboard/agents/subscription` lists available plans + current sub | ✅ |
| 24 | **Agent wallet** — `wallet_entries.agent_id` column added (nullable). Agent wallet balance + top-up API (`GET/POST /api/v1/wallet/agent`). Agent wallet page at `/dashboard/wallet/agent` with balance display, top-up buttons, transaction history | ✅ |
| 25 | **Call-readiness gate** — `routeCall` checks each candidate: active subscription with remaining allowance OR positive wallet balance. `walletEligible` reflects result; ineligible agents are rejected in routing. `finalizeCall` deducts 1 call from subscription or $1.00 from agent wallet per completed call | ✅ |

## Phase 8 — Sub-agency & Recruitment (NEW)

| # | Task | Status |
|---|------|--------|
| 26 | **Parent-child agency** — Add `parent_agency_id` to `app.agencies`. Agents can create a sub-agency under themselves. Sub-agency inherits/revenue-shares with parent | ⏳ |
| 27 | **Recruitment invites** — `app.recruitment_invites` table: `inviter_membership_id`, `invitee_email`, `token`, `status` (pending/accepted/expired), `sub_agency_id`. Generate unique invite link with token | ⏳ |
| 28 | **Invite UI** — Agent dashboard has "Recruit" page: input email, send invite link, track status. Invitee clicks link → register → auto-added to sub-agency as agent | ⏳ |
| 29 | **Revenue sharing** — Parent agency gets X% commission on dispositions earned by sub-agency agents. Configurable split on `app.agencies` via `commission_rate` | ⏳ |

## Phase 9 — Support & Notifications

| # | Task | Status |
|---|------|--------|
| 30 | Support ticket system — `app.support_tickets` table, API (create/reply/close), admin + agent dashboard pages | ⏳ |
| 31 | Real-time notifications — Socket.io for live call events, push to agent browser | ⏳ |

## Phase 10 — Admin Enhancements

| # | Task | Status |
|---|------|--------|
| 32 | Revenue report page — Dedicated admin/revenue page with charts | ⏳ |
| 33 | Per-role settings pages — Agent settings, finance settings | ⏳ |
| 34 | **Disposition admin review** — Admin panel to view pending dispositions, confirm/reject, with per-agent summary | ⏳ |
| 35 | **Plan management** — Admin CRUD for agent subscription plans under their agency | ⏳ |

---

## Key Model Changes

### Billing Model (Critical)
**Old:** Agency pays `price_cents × connected_seconds` per call, deducted from agency wallet.
**New:** Agent pays per call via subscription (monthly allowance) or credits (pay-per-call). Earnings are disposition-based — agent gets paid only on confirmed outcomes (sold/qualified). Admin sets payout rates per disposition type.

### Agent → Agency Relationship
**Old:** Agency owns agents. Agents are members of one agency.
**New:** Agents can create sub-agencies and recruit their own team. Parent agency gets commission on sub-agency revenue.

### Data Model Additions
- `app.dispositions` — call outcome, admin confirmation
- `app.agent_plans` — subscription plan definitions
- `app.agent_subscriptions` — agent ↔ plan links
- `app.recruitment_invites` — email invites with tokens
- `app.agencies.parent_agency_id` — self-referential hierarchy
- `app.agencies.commission_rate` — revenue split percentage
- `app.wallet_entries.agent_id` — per-agent wallet support
- `app.agents.availability` — used by go-online toggle (exists, needs UI)

---

## Build & Verify

- **Build:** `npx next build` — must compile with zero errors
- **Tests:** `npx vitest run` — all tests must pass before moving to next phase
- **DB migrations:** SQL files in `supabase/migrations/`, applied via `npm run migrate` (`scripts/run-migrations.cjs` — versioned in `public.schema_migrations`, one transaction per file). New files must be `NNNN_description.sql` with contiguous numbering; `npm run check:migrations` fails CI on drift. `npm run seed -- --yes` (dev only) rebuilds the schema from all migrations. Ad-hoc hotfix SQL: `node scripts/apply-migration.cjs <file>`.
- **Code conventions:** Custom CSS (no Tailwind), pg raw SQL (no ORM), Zod validation, Better Auth
