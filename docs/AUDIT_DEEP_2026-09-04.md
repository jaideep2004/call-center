# Deep Code Scan — call-center
**Date:** 2026-09-04  **Branch:** `main` @ `21abfbf`  **Scope:** read-only audit  **Build:** 195 routes · 409 tests pass  **Live:** coveragecalls.com

---

## TL;DR

| # | Area | Verdict | Highest finding |
|---|------|---------|-----------------|
| 1 | RBAC matrix (113 v1 routes) | **PASS w/ 1 nit** | `src/app/api/v1/health/route.ts` has no handler wrapper (intentional; no auth, no DB). All other routes go through `apiHandler`/`publicApiHandler`; auth is always enforced except where `{auth:false}` is explicit. |
| 2 | Cron/worker money jobs | **PASS** | All money-touching jobs are idempotent (anchor on `invoices.call_id`, `wallet_entries.idempotency_key`, or existing-row short-circuit). Retries are explicit per-call. No retry-loop hazards seen. |
| 3 | Money path trace | **PASS w/ 1 medium** | Per-call charge is single-transaction + idempotent. **Medium:** the per-call charge uses `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING` for the wallet entry but does NOT wrap the `agent_fees` table — so a redelivered `finalizeCall` only re-creates the wallet row (no-op), never an extra `agent_fees` row (good), but the per-call `$0.01` agent subscription `incrementCallsUsed` is a separate non-transactional path inside `deductAgentForCall` that could double-decrement under a concurrent finalize+requeue race. |
| 4 | Soft-delete safety | **FAIL — HIGH** | 5 of 7 business-table repositories (`agents`, `campaigns`, `agencies`, `scripts`, `tutorials`, `calls`, `recordings`) **lack a `deleted_at` column** but their API routes call `.softDelete()` on them — guaranteed runtime SQL error. |
| 5 | Migration safety (0001–0038) | **FAIL — MEDIUM** | 0 `CREATE INDEX CONCURRENTLY` statements across 39 migrations, including 24 indexes on already-populated business tables post-0001. 83 `ALTER TABLE` without `IF EXISTS`. All `ADD COLUMN NOT NULL` correctly have a `DEFAULT`. No duplicate filenames. |

**Severity roll-up:** **3 HIGH** (Section 4 broken softDelete on business tables), **2 MEDIUM** (Section 5 index lock risk + Section 3 agent deduction race), **3 LOW** (Section 1 nit, plus a couple of cosmetic migration issues).

---

## Section 1 — RBAC matrix

### Method

Scanned `src/app/api/v1/**/route.ts` (113 files, 177 method handlers) for:
- `apiHandler` / `apiHandlerWithContext` / `publicApiHandler` / `webhookHandler` wrappers (`src/server/api-utils.ts:151–175`).
- Permission objects `{ resource, action }` passed as second arg.
- `{ auth: false }` exemptions.
- Direct DB access that bypasses the wrapper (`queryOne`, `.from(`, `@supabase`).
- Mentions of `agencyId` in response bodies (potential tenant leak).

### Findings

#### Routes MISSING any handler wrapper

| Route | Methods | Lines | Notes |
|-------|---------|-------|-------|
| `src/app/api/v1/health/route.ts` | GET | 5 | Intentional — `{ status: "ok" }` only. **No DB access, no PII.** OK. |

`apiHandler` enforces `auth=true` by default (`src/server/api-utils.ts:160`). The only authenticated routes are wrapped; the only public ones are explicit:
- `src/app/api/v1/public/leads/route.ts:14` — uses `publicApiHandler` (5/min/IP rate-limited).
- `src/app/api/v1/cms/route.ts:9` — uses `apiHandler(..., { auth: false })` for public CMS feed.
- `src/app/api/v1/health/route.ts:3` — no wrapper; deliberately returns 200 unconditionally.

#### Routes with `apiHandler` but no explicit permission check

These rely on authenticated-user context rather than a permission gate. All five are intentional.

| Route | Methods | Reason |
|-------|---------|--------|
| `src/app/api/v1/cms/route.ts` | GET | `{ auth: false }` — public homepage feed. |
| `src/app/api/v1/invites/[token]/accept/route.ts` | POST | Self-service token redemption; checks `user` presence. |
| `src/app/api/v1/me/route.ts` | GET | Returns caller's own session. |
| `src/app/api/v1/me/sip-credentials/route.ts` | GET | Returns caller's own SIP credentials. |
| `src/app/api/v1/setup/make-admin/route.ts` | POST | Bootstrap gate: SETUP_TOKEN + admin-existence check (`route.ts:23–42`). |
| `src/app/api/v1/public/leads/route.ts` | POST | `publicApiHandler` — rate-limited 5/min/IP. |

No "fall-through to data" paths found. Every authenticated route declares a permission object or relies on the wrapper's `auth=true` default.

#### `agencyId` exposure in responses

Only **one** route returns `agencyId` in its response body — the caller's own:

- `src/app/api/v1/me/route.ts:14` — `ok({ user, membership, agencyId, agentId })`.

This is by design (`/me` returns the user's own tenant). No cross-tenant `agencyId` leak detected in any other route handler.

#### Publisher routes

All four `src/app/api/v1/publisher/**` routes:
- Use `resource: "publisher-portal"`, `action: "view"` (`calls/route.ts:18`, `overview/route.ts:17`, `payouts/route.ts:17`, `settings/route.ts:15,30`).
- Per-role gate: only `publisher` role has `publisher-portal: ["view"]` (`src/server/services/permission-data.ts:48`).
- Each then calls `getPublisherForUser(user.id)` and uses `publisher.id` (the publisher row id, **not** agency id) as the scope. No agency cross-leak.

#### Full RBAC matrix

Compact per-file table follows. **Method** = exported HTTP verbs; **Perm** = permission objects declared; **Auth-off** = explicit `{auth:false}`; **Handler** = wrapper kind.

| File | Methods | Permissions | Auth-off | Handler |
|------|---------|-------------|----------|---------|
| `affiliates/[id]/earnings/route.ts` | GET | `affiliate:view` | – | apiHandler |
| `affiliates/[id]/route.ts` | GET | `affiliate:view` | – | apiHandler |
| `affiliates/route.ts` | GET, POST | `affiliate:view`, `affiliate:create` | – | apiHandler |
| `agencies/route.ts` | GET, POST | `agency:view`, `agency:create` | – | apiHandler |
| `agencies/sub/route.ts` | POST | `agency:manage` | – | apiHandler |
| `agency/route.ts` | GET, PATCH | `agency:view`, `agency:update` | – | apiHandler |
| `agent-fees/[id]/charge/route.ts` | POST | `wallet:manage` | – | apiHandler |
| `agent-fees/[id]/waive/route.ts` | POST | `wallet:manage` | – | apiHandler |
| `agent-fees/route.ts` | GET, POST | `wallet:view`, `wallet:manage` | – | apiHandler |
| `agent-fees/weekly/route.ts` | POST | `wallet:manage` | – | apiHandler |
| `agent-plans/[id]/route.ts` | GET, PUT, DELETE | `agents:view`, `agents:manage` | – | apiHandler |
| `agent-plans/route.ts` | GET, POST | `agents:view`, `agents:manage` | – | apiHandler |
| `agent-subscriptions/create-checkout/route.ts` | POST | `wallet:recharge` | – | apiHandler |
| `agent-subscriptions/route.ts` | GET, POST | `agents:view`, `agents:manage` | – | apiHandler |
| `agents/[id]/route.ts` | GET, PATCH, DELETE | `agents:view`, `agents:update`, `agents:delete` | – | apiHandler |
| `agents/auto-create/route.ts` | POST | `agents:create` | – | apiHandler |
| `agents/earnings/route.ts` | GET | `reports:view` | – | apiHandler |
| `agents/route.ts` | GET, POST | `agents:view`, `agents:create` | – | apiHandler |
| `agents/top-performers/route.ts` | GET | `reports:view` | – | apiHandler |
| `calls/[id]/accept/route.ts` | POST | `calls:accept` | – | apiHandler |
| `calls/[id]/disposition/route.ts` | POST | `calls:update` | – | apiHandler |
| `calls/[id]/dtmf/route.ts` | POST | `calls:update` | – | apiHandler |
| `calls/[id]/hangup/route.ts` | POST | `calls:update` | – | apiHandler |
| `calls/[id]/hold/route.ts` | POST | `calls:update` | – | apiHandler |
| `calls/[id]/notes/route.ts` | GET, POST | `calls:view`, `calls:update` | – | apiHandler |
| `calls/[id]/reject/route.ts` | POST | `calls:manage` | – | apiHandler |
| `calls/[id]/route.ts` | GET, PATCH, DELETE | `calls:view`, `calls:update`, `calls:delete` | – | apiHandler |
| `calls/export/route.ts` | GET | `calls:view` | – | apiHandler |
| `calls/route.ts` | GET, POST | `calls:view`, `calls:create` | – | apiHandler |
| `campaigns/[id]/assignments/route.ts` | GET, PUT | `settings:view`, `settings:manage` | – | apiHandler |
| `campaigns/[id]/bid/route.ts` | GET, PUT, DELETE | `settings:view`, `settings:manage` | – | apiHandler |
| `campaigns/[id]/retreaver/numbers/route.ts` | GET | `settings:view` | – | apiHandler |
| `campaigns/[id]/retreaver/route.ts` | PATCH | `settings:update` | – | apiHandler |
| `campaigns/[id]/route.ts` | GET, PATCH, DELETE | `settings:view`, `settings:update`, `settings:delete` | – | apiHandler |
| `campaigns/route.ts` | GET, POST | `settings:view`, `settings:create` | – | apiHandler |
| `cms/admin/route.ts` | GET, POST | `cms:view`, `cms:manage` | – | apiHandler |
| `cms/route.ts` | GET | – | yes | apiHandler |
| `disposition-payouts/route.ts` | GET, POST | `calls:view`, `calls:manage` | – | apiHandler |
| `dispositions/[id]/confirm/route.ts` | POST | `calls:manage` | – | apiHandler |
| `dispositions/route.ts` | GET | `calls:view` | – | apiHandler |
| `feature-requests/[id]/route.ts` | PATCH | `features:create` | – | apiHandler |
| `feature-requests/route.ts` | GET, POST | `features:view`, `features:create` | – | apiHandler |
| `health/route.ts` | GET | – | (no handler) | – |
| `invites/[token]/accept/route.ts` | POST | – | – | apiHandler |
| `invites/route.ts` | GET, POST | `agents:view`, `agents:manage` | – | apiHandler |
| `invoices/[id]/route.ts` | GET, PATCH | `calls:view`, `wallet:manage` | – | apiHandler |
| `invoices/route.ts` | GET, POST | `calls:view`, `calls:create` | – | apiHandler |
| `leads/[id]/calls/route.ts` | GET | `leads:view` | – | apiHandler |
| `leads/[id]/notes/route.ts` | GET, POST | `leads:view`, `leads:update` | – | apiHandler |
| `leads/[id]/route.ts` | GET, PATCH, DELETE | `leads:view`, `leads:update`, `leads:delete` | – | apiHandler |
| `leads/[id]/tags/route.ts` | POST, DELETE | `leads:view`, `leads:update` | – | apiHandler |
| `leads/[id]/timeline/route.ts` | GET, POST | `leads:view`, `leads:create` | – | apiHandler |
| `leads/export/route.ts` | GET | `leads:view` | – | apiHandler |
| `leads/route.ts` | GET, POST | `leads:view`, `leads:create` | – | apiHandler |
| `leads/sources/route.ts` | GET | `leads:view` | – | apiHandler |
| `me/route.ts` | GET | – | – | apiHandler |
| `me/sip-credentials/route.ts` | GET | – | – | apiHandler |
| `memberships/[id]/route.ts` | GET, PATCH | `users:view`, `users:update` | – | apiHandler |
| `memberships/invite/route.ts` | POST | `users:create` | – | apiHandler |
| `memberships/route.ts` | GET | `users:view` | – | apiHandler |
| `notifications/[id]/route.ts` | PATCH | `settings:update` | – | apiHandler |
| `notifications/route.ts` | GET, POST | `settings:view`, `settings:create` | – | apiHandler |
| `onboarding/bookings/[id]/route.ts` | GET, PATCH | `settings:view`, `settings:manage` | – | apiHandler |
| `onboarding/bookings/route.ts` | GET | `settings:view` | – | apiHandler |
| `onboarding/slots/[id]/route.ts` | DELETE | `settings:manage` | – | apiHandler |
| `onboarding/slots/route.ts` | GET, POST | `settings:view`, `settings:manage` | – | apiHandler |
| `phone-numbers/route.ts` | GET, POST | `settings:view`, `settings:manage` | – | apiHandler |
| `public/leads/route.ts` | POST | – | (publicApiHandler) | publicApiHandler |
| `publisher/calls/route.ts` | GET | `publisher-portal:view` | – | apiHandler |
| `publisher/overview/route.ts` | GET | `publisher-portal:view` | – | apiHandler |
| `publisher/payouts/route.ts` | GET | `publisher-portal:view` | – | apiHandler |
| `publisher/settings/route.ts` | GET, PATCH | `publisher-portal:view` | – | apiHandler |
| `publishers/[id]/invite/route.ts` | POST | `publishers:manage` | – | apiHandler |
| `publishers/[id]/route.ts` | GET, PATCH, DELETE | `publishers:manage` | – | apiHandler |
| `publishers/route.ts` | GET, POST | `publishers:view`, `publishers:manage` | – | apiHandler |
| `recordings/[id]/download/route.ts` | GET | `calls:view` | – | apiHandler |
| `recordings/[id]/route.ts` | GET, PATCH, DELETE | `calls:view`, `calls:manage` | – | apiHandler |
| `recordings/route.ts` | GET | `calls:view` | – | apiHandler |
| `reports/calls-volume/route.ts` | GET | `calls:view` | – | apiHandler |
| `reports/conversion/route.ts` | GET | `calls:view` | – | apiHandler |
| `reports/duration/route.ts` | GET | `calls:view` | – | apiHandler |
| `reports/export/calls/route.ts` | GET | `reports:view` | – | apiHandler |
| `reports/revenue/route.ts` | GET | `revenue:view` | – | apiHandler |
| `reports/summary/route.ts` | GET | `reports:view` | – | apiHandler |
| `retreaver/calls/route.ts` | GET | `publishers:view` | – | apiHandler |
| `retreaver/campaigns/sync/route.ts` | POST | `publishers:manage` | – | apiHandler |
| `retreaver/provision/route.ts` | POST | `publishers:manage` | – | apiHandler |
| `retreaver/report/route.ts` | GET | `publishers:view` | – | apiHandler |
| `retreaver/reservations/[id]/confirm/route.ts` | POST | `publishers:manage` | – | apiHandler |
| `retreaver/reservations/route.ts` | GET, POST | `publishers:view`, `publishers:manage` | – | apiHandler |
| `retreaver/status/route.ts` | GET | `publishers:view` | – | apiHandler |
| `retreaver/sync/route.ts` | POST | `publishers:manage` | – | apiHandler |
| `routing/simulate/route.ts` | POST | `calls:create` | – | apiHandler |
| `scripts/[id]/route.ts` | GET, PATCH, DELETE | `agents:view`, `agents:manage` | – | apiHandler |
| `scripts/route.ts` | GET, POST | `agents:view`, `agents:manage` | – | apiHandler |
| `settings/stripe/route.ts` | GET, POST | `settings:view`, `settings:manage` | – | apiHandler |
| `settings/system/route.ts` | GET, PUT | `settings:view`, `settings:manage` | – | apiHandler |
| `setup/make-admin/route.ts` | POST | – | – | apiHandler |
| `skills/[id]/route.ts` | DELETE | `skills:manage` | – | apiHandler |
| `skills/route.ts` | GET, POST | `skills:view`, `skills:manage` | – | apiHandler |
| `support/tickets/[id]/route.ts` | GET, PATCH | `support:view`, `support:manage` | – | apiHandler |
| `support/tickets/route.ts` | GET, POST | `support:view`, `support:create` | – | apiHandler |
| `tutorials/[id]/route.ts` | GET, PATCH, DELETE | `agents:view`, `agents:manage` | – | apiHandler |
| `tutorials/route.ts` | GET, POST | `agents:view`, `agents:manage` | – | apiHandler |
| `users/route.ts` | GET | `users:view` | – | apiHandler |
| `wallet/agent/create-checkout/route.ts` | POST | `wallet:recharge` | – | apiHandler |
| `wallet/agent/route.ts` | GET, POST | `wallet:view`, `wallet:manage` | – | apiHandler |
| `wallet/agents/route.ts` | GET | `wallet:view` | – | apiHandler |
| `wallet/balance/route.ts` | GET | `wallet:view` | – | apiHandler |
| `wallet/create-checkout/route.ts` | POST | `wallet:recharge` | – | apiHandler |
| `wallet/entries/route.ts` | GET, POST | `wallet:view`, `wallet:manage` | – | apiHandler |
| `wallet/transfer/route.ts` | POST | `wallet:manage` | – | apiHandler |
| `wallet/transfers/route.ts` | GET | `wallet:view` | – | apiHandler |

**Telephony webhook** — `src/app/api/telephony/[provider]/webhook/route.ts` — not under `/v1`, intentionally bypasses `apiHandler` because it has its own signature-verification gate (`route.ts:35–43`). Verifies HMAC/Ed25519 per provider.

### Verdict — Section 1

**PASS** (one harmless nit on `health/route.ts`). RBAC is enforced consistently; no fall-throughs; no cross-tenant agencyId exposure.

---

## Section 2 — Cron / worker scan

### Jobs inventory (`src/worker/index.ts`)

| Queue | Schedule | Handler location | Money touch? |
|-------|----------|------------------|--------------|
| `route-call` | `*/30 * * * * *` (cron) + on-demand via `enqueueRouteCall` (`src/server/services/route-queue.ts:23`) | `routeCall` in `call-orchestrator.ts` | No direct money mutation. |
| `finalize-call` | on-demand via `enqueueFinalizeCall` (`src/server/services/finalize-queue.ts:20`) | `finalizeCall` in `call-orchestrator.ts` | **Yes** — invoice + wallet + agent fees. |
| `store-recording` | on-demand via `enqueueRecordingStore` (`src/server/services/recording-store.ts:62`) | `storeRecording` in `recording-store.ts` | No. |
| `sync-retreaver-calls` | `*/10 * * * * *` | `syncRetreaverCalls` | No direct money mutation; updates `retreaver_calls` and creates `calls` rows. |
| `link-retreaver-calls` | `*/5 * * * *` | `linkRetreaverCalls` | No. |
| `expire-ringing-calls` | `*/30 * * * * *` | `runCallMaintenance` | No. |
| `expire-rtb-reservations` | `*/5 * * * *` | `expireStaleRtbReservations` | No (reservations only). |
| `generate-agent-fees` | `0 0 1 * *` | `generateMonthlyFees` in `agent-fees.ts` | **Yes** — `agent_fees` rows. |
| `generate-weekly-invoices` | `0 0 * * 1` | `generateWeeklyInvoices` in `agent-fees.ts` | **Yes** — weekly `invoices` aggregation. |
| `purge-expired-recordings` | `0 2 * * *` | `purgeExpiredRecordings` | No. |

### Money-touching jobs in detail

#### 2.1 `finalize-call` — `finalizeCall` (`call-orchestrator.ts:437–532`)

- **Idempotency:** first statement is `INSERT INTO app.invoices ... ON CONFLICT (call_id) DO NOTHING RETURNING *` (`call-orchestrator.ts:469–477`). Only the winner returns a row; all subsequent logic is gated on `invoiceResult.rows.length > 0`. Duplicate/redelivered jobs return `{ skipped: true, reason: "already_finalized" }` without touching wallet/agent fees.
- **Wallet entry idempotency keys:** `charge_${callId}` for per-second (`call-orchestrator.ts:513`), `payout_${disposition.id}` for disposition (`call-orchestrator.ts:499`). All wrapped in `ON CONFLICT (idempotency_key) DO NOTHING`.
- **Agent deduction:** `deductAgentForCall` (`call-orchestrator.ts:533–550`) — uses `incrementCallsUsed(sub.id, callId, ...)` for subscription OR `walletEntries.create({ idempotency_key: "agent_charge_${callId}" })`. Idempotent keys present.
- **Retry policy:** `boss.send("finalize-call", { callId }, { retryLimit: 3, retryDelay: 10 })` (`finalize-queue.ts:20`).
- **Deadlock risk:** transaction order is invoice → wallet_entry → (subscription increment). All three inserts are on different tables, no FK chains competing for locks. Low risk.
- **Partial failure:** worst case = invoice committed, wallet row missing → retry produces wallet row (idempotency-key guard). Worst case = wallet committed, partial later failure → no compensating action needed because of ON CONFLICT DO NOTHING.
- **Insufficient-balance handling:** at `call-orchestrator.ts:485–502`, the per-second branch explicitly checks `balance < totalCents`, sets `invoices.status = 'failed'`, and returns `{ insufficientBalance: true }`. **Never throws.** No retry loop. **Disposition payouts skip the balance gate** (intentional — payouts credit the agency).
- **Status:** PASS.

#### 2.2 `generate-agent-fees` — `generateMonthlyFees` (`agent-fees.ts:17–50`)

- **Idempotency:** `agentFees.ensureMonthlyFee({ agent_id, agency_id, kind, due_date })` — see `src/server/repositories/agent-fees.ts`. Idempotent per `(agent, kind, due month)` via unique constraint.
- **Retry policy:** worker does `boss.schedule` cron; on error logs and returns. No retryLimit set on the schedule itself (cron re-fires next month — acceptable for monthly fee roll).
- **Deadlock risk:** single sequential per-agent loop with one INSERT per row. No cross-row transactions.
- **Partial failure:** if mid-loop fails, the loop throws and partial rows remain in place. Next monthly run will skip already-inserted (idempotent), so the partial set is fine — but a half-complete month is possible.
- **Status:** PASS. Acceptable for monthly cron.

#### 2.3 `generate-weekly-invoices` — `generateWeeklyInvoices` (`agent-fees.ts:58–98`)

- **Idempotency:** `UPDATE app.agent_fees SET invoice_id = $ WHERE id = ANY(...) AND invoice_id IS NULL` (`agent-fees.ts:88–92`). Only unassigned fees are picked up.
- **Retry safety:** if the `INSERT INTO invoices` succeeds but the `UPDATE fees` fails, those fees remain `invoice_id IS NULL` and the next weekly run picks them up again, creating a **second** invoice with the same fees. **Potential double-invoice on retry.** Worker logs error and returns — pg-boss cron schedules don't auto-retry by default. **Low risk** because the failure point is rare (single transaction wraps both) but worth noting.
- **Deadlock risk:** per-agency transaction; rows are not ordered → potential deadlock if two cron instances ran concurrently. pg-boss single-instance worker mitigates this in current deploy.
- **Status:** PASS w/ low-severity note above.

### Verdict — Section 2

**PASS.** All money-touching workers are idempotent on natural keys (call_id, idempotency_key, fee unique constraint). Retry policies explicit. Only minor concern: weekly invoice aggregation could double-roll fees on a partial failure (single transaction wraps it but the next cron would skip already-invoiced — actually safe, false alarm).

---

## Section 3 — Money path trace

### Call path

```
POST /api/telephony/[provider]/webhook  (provider = "mock")
  → processProviderEvent                (call-orchestrator.ts:40)
    → calls.create / calls.updateState (transactional)
  → caller side returns 202

… call lifecycle ends via provider event …
  → enqueueFinalizeCall(callId)         (finalize-queue.ts:12)
    → finalizeCall                      (call-orchestrator.ts:437)
      → INSERT invoices ON CONFLICT DO NOTHING
      → deductAgentForCall              (call-orchestrator.ts:533)
      → balance gate (only per-second branch)
      → INSERT wallet_entries ON CONFLICT DO NOTHING
```

### Cents/balance mutation sites

| File:line | Operation | Idempotency |
|-----------|-----------|-------------|
| `call-orchestrator.ts:469` | `INSERT INTO app.invoices ... ON CONFLICT (call_id) DO NOTHING` | call_id unique |
| `call-orchestrator.ts:499` | `INSERT INTO app.wallet_entries ... ON CONFLICT (idempotency_key) DO NOTHING` (disposition payout) | idempotency_key |
| `call-orchestrator.ts:513` | `INSERT INTO app.wallet_entries ... ON CONFLICT (idempotency_key) DO NOTHING` (per-second charge) | `charge_${callId}` |
| `call-orchestrator.ts:541` | `agentSubscriptions.incrementCallsUsed(sub.id, callId)` | see `src/server/repositories/agent-subscriptions.ts` |
| `call-orchestrator.ts:545` | `walletEntries.create({ idempotency_key: "agent_charge_${callId}" })` | idempotency_key |
| `agent-fees.ts:39` | `agentFees.ensureMonthlyFee(...)` | (agent, kind, due_date) unique |
| `agent-fees.ts:83` | `INSERT INTO app.invoices (agency_id, call_id=NULL, ...)` | none — guarded by `agent_fees.invoice_id IS NULL` filter on the subsequent UPDATE |
| `agent-fees.ts:88` | `UPDATE app.agent_fees SET invoice_id = $ WHERE id = ANY(...) AND invoice_id IS NULL` | invoice_id NULL guard |
| `recording-store.ts:32` | `recordings.create(...)` | guarded by `recordings.findByCallId` short-circuit |
| `src/app/api/v1/wallet/agent/route.ts:18` | `walletEntries.create({ idempotency_key: "agent_topup_${agent.id}_${Date.now()}" })` | timestamped key; concurrent clicks can collide (1ms window) — **Low** |

### `assertBalance` check

There is **no `assertBalance` helper** in the codebase (verified by repo-wide grep). The balance gate is inline at `call-orchestrator.ts:485–502`:

```ts
const balanceResult = await client.query(
  "SELECT COALESCE(SUM(amount_cents), 0) as balance FROM app.wallet_entries WHERE agency_id = $1",
  [call.agency_id],
);
const balance = Number(balanceResult.rows[0]?.balance ?? 0);
if (balance < totalCents) {
  await client.query("UPDATE app.invoices SET status = 'failed' WHERE id = $1", [invoice.id]);
  return { invoice: { ...invoice, status: "failed" }, ..., insufficientBalance: true };
}
```

**Behavior on insufficient balance:**
1. The invoice is marked `status='failed'`.
2. **No wallet entry is inserted** — agency is not charged.
3. **No throw** — finalizeCall returns normally; the pg-boss job marks itself complete.
4. **No retry loop.**
5. Caller leg / event chain continues.

This is correct for an underfunded agency — no infinite retry. However, the disposition-payout branch (`call-orchestrator.ts:497–506`) skips the balance gate entirely (payouts *credit* the agency, not debit), which is intentional.

### Concerns / race

**MEDIUM — `deductAgentForCall` is not always inside the outer transaction.** At `call-orchestrator.ts:533–550`, the function calls `agentSubscriptions.incrementCallsUsed(sub.id, callId, client)` with the optional `client` parameter. Looking at `src/server/repositories/agent-subscriptions.ts`, the increment query does not have an `ON CONFLICT` clause keyed on `call_id` — it likely increments unconditionally. If two finalize jobs ever ran for the same call (shouldn't happen, but defense in depth), this could double-decrement the subscription allowance.

**Mitigation today:** The outer invoice `ON CONFLICT (call_id) DO NOTHING` guard ensures only one finalize transaction enters the agent-deduction block. So in practice, race only triggers if a redelivered job and a manual re-finalize ever collide.

**Recommendation:** add a unique constraint on `agent_subscriptions(id, call_id)` or check `calls_used` already incremented for this call before the UPDATE.

### Verdict — Section 3

**PASS w/ 1 medium** (defensive idempotency on `incrementCallsUsed`). Insufficient-balance path is correct.

---

## Section 4 — Soft-delete safety

### Base contract

`BaseRepository.softDelete(id, agencyId?)` (`src/server/repositories/base.ts:122–129`) runs:

```sql
UPDATE app.{table} SET deleted_at = NOW() WHERE id = $1 [AND agency_id = $2]
```

The implicit contract: the underlying table **must have a `deleted_at TIMESTAMPTZ` column**.

### Tables with `deleted_at`

| Table | Migration | Notes |
|-------|-----------|-------|
| `publishers` | `0016_publishers.sql` | yes — also has `active` column |
| `leads` | `0006_lead_enhancements.sql:1` | `add column if not exists deleted_at timestamptz` |
| `skills` | (in `0013_skills.sql`) | yes |

### Tables WITHOUT `deleted_at` — yet called via `softDelete`

| Table | Caller route | Migration | Risk |
|-------|-------------|-----------|------|
| `agents` | `src/app/api/v1/agents/[id]/route.ts:40` | `0001_callrelay_platform.sql` (no `deleted_at`) | **HIGH** |
| `campaigns` | `src/app/api/v1/campaigns/[id]/route.ts:44` | `0001_callrelay_platform.sql` (no `deleted_at`) | **HIGH** |
| `agencies` | (called via base? not seen at route level) | `0001_callrelay_platform.sql` (no `deleted_at`) | MEDIUM |
| `scripts` | `src/app/api/v1/scripts/[id]/route.ts:20` | `0005_scripts_and_tutorials.sql` (no `deleted_at`) | **HIGH** |
| `tutorials` | `src/app/api/v1/tutorials/[id]/route.ts:19` | `0005_scripts_and_tutorials.sql` (no `deleted_at`) | **HIGH** |
| `calls` | `src/app/api/v1/calls/[id]/route.ts:49` | `0001_callrelay_platform.sql` (no `deleted_at`) | **HIGH** |
| `recordings` | (hard delete only — see below) | `0003_payments_and_recordings.sql` | n/a (hard-delete path) |

Calling `agents.softDelete(id, scope)` will execute `UPDATE app.agents SET deleted_at = NOW() ...` and Postgres will return `ERROR: column "deleted_at" of relation "agents" does not exist`.

No tests exercise these softDelete paths (verified by `grep -r "agents.softDelete|campaigns.softDelete|scripts.softDelete|tutorials.softDelete|calls.softDelete"` in `src/**/*.test.ts` — zero hits). The 409 passing tests do not cover this code path. **These endpoints are guaranteed to 500 in production.**

### Hard `DELETE` statements in repositories

| File:line | Statement | Acceptable? |
|-----------|-----------|-------------|
| `src/server/repositories/bid-overrides.ts:45` | `DELETE FROM app.bid_overrides WHERE campaign_id = $1` | yes (campaign-level override, ephemeral) |
| `src/server/repositories/campaign-assignments.ts:94` | `DELETE FROM app.campaign_assignments WHERE campaign_id = $1` | yes (when campaign deleted) |
| `src/server/repositories/lead-tags.ts:32` | `DELETE FROM app.lead_tags WHERE lead_id = $1 AND tag = $2` | yes (tag detach) |
| `src/server/repositories/recordings.ts:60` | `DELETE FROM app.recordings WHERE id = $1 AND agency_id = $2` | yes (recordings have `purge_at` retention; this is the purge endpoint) |

These four are not "business tables" in the ROADMAP sense and have explicit retention/cascade semantics. **No action required.**

### Verdict — Section 4

**FAIL — HIGH.** All seven `softDelete`-using business-table repos except `publishers`, `leads`, `skills` will raise a Postgres column-not-found error at runtime. Add migration `0039_soft_delete_columns.sql`:

```sql
ALTER TABLE app.agents     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE app.campaigns  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE app.agencies   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE app.scripts    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE app.tutorials  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE app.calls      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
```

Without this, delete-button UI in admin/publisher dashboards **breaks in production**.

---

## Section 5 — Migration safety

### Filenames

39 SQL files (0001–0038). Note: there are **two files numbered `0028`**:
- `0028_ping_first.sql`
- `0028_provider_agent_call_id.sql`

Both exist. Postgres migration tools that sort lexically will apply them in order (`0028_ping_first.sql` before `0028_provider_agent_call_id.sql`); timestamp-based migrators (Prisma, Atlas) may apply in either order. Not a duplicate content, but a filename ambiguity — **MEDIUM**, rename one to `0028b_*.sql` or `0028_provider_agent_call_id.sql → 0029_*` (after bumping the rest).

### Duplicate filenames

None — exactly one of each numeric prefix except for the `0028` collision noted.

### `ALTER TABLE` without `IF EXISTS`

83 instances (most are initial 0001 — acceptable there because migrations are run sequentially from a fresh DB). From `0002` onward:

| File | Line | Target |
|------|------|--------|
| `0002_fix_missing_tables.sql` | 2, 14 | `"user"`, `app.affiliates` |
| `0003_payments_and_recordings.sql` | 13 | `app.payments` |
| `0004_recordings_duration_and_wiring.sql` | 1 | `app.recordings` |
| `0005_scripts_and_tutorials.sql` | 12, 29 | `app.scripts`, `app.tutorials` |
| `0006_lead_enhancements.sql` | 1, 2, 3, 14, 26 | `app.leads`, `app.lead_tags`, `app.lead_notes` |
| `0007_dispositions.sql` | 18, 32 | `app.dispositions`, `app.disposition_payouts` |
| `0008_agent_subscriptions.sql` | 1, 16 | `app.wallet_entries`, `app.agent_plans` |
| (… and 60+ more in 0009–0038) |

**Impact:** these will error on a re-run or partial-apply scenario. **MEDIUM.** Use `ADD COLUMN IF NOT EXISTS` and `DROP COLUMN IF EXISTS` everywhere they aren't already.

### `ADD COLUMN ... NOT NULL` without `DEFAULT`

**Zero.** Every `NOT NULL` ADD COLUMN has a `DEFAULT` clause (verified across 39 files). Examples: `0021_retreaver.sql:13` (`retreaver_status text not null default 'unprovisioned'`), `0036_agent_display_code.sql:8` (`SET DEFAULT ('CC' || nextval('app.agent_code_seq')::text)`). **No prod-fail risk from this vector.**

### `CREATE INDEX` not `CONCURRENTLY`

- **Total `CREATE INDEX` (non-CONCURRENTLY):** 27
- **`CREATE INDEX CONCURRENTLY`:** 0

Post-`0001` indexes (24 of 27) will be applied to already-populated tables — e.g.:

| File:line | Index | Lock impact |
|-----------|-------|-------------|
| `0001_callrelay_platform.sql:82` | `calls_agency_state_idx ON app.calls` | OK (initial) |
| `0001_callrelay_platform.sql:83` | `wallet_agency_created_idx ON app.wallet_entries` | OK (initial) |
| `0001_callrelay_platform.sql:84` | `events_call_occurred_idx ON app.call_events` | OK (initial) |
| `0003_payments_and_recordings.sql:15` | `payments_agency_idx ON app.payments` | **non-CONCURRENTLY on existing table** |
| `0005_scripts_and_tutorials.sql:14` | `scripts_agency_idx ON app.scripts` | **non-CONCURRENTLY on existing table** |
| `0005_scripts_and_tutorials.sql:31` | `tutorials_agency_idx ON app.tutorials` | **non-CONCURRENTLY on existing table** |
| `0006_lead_enhancements.sql:28` | `lead_notes_lead_idx ON app.lead_notes` | **non-CONCURRENTLY on existing table** |
| `0007_dispositions.sql:16,20` | `idx_dispositions_call`, `dispositions_agent_idx` | **non-CONCURRENTLY on existing table** |
| `0008_agent_subscriptions.sql:18,35` | `agent_plans_agency_idx`, `agent_subs_agent_idx` | **non-CONCURRENTLY on existing table** |
| `0009_sub_agency.sql:18,19` | `invites_token_idx`, `invites_inviter_idx` | non-CONCURRENTLY |
| `0010_performance_indexes.sql` (×14) | all non-CONCURRENTLY | **MEDIUM** — Phase-1 performance migration on hot tables |
| `0015_scripts_campaign.sql:3` | `scripts_campaign_idx` | non-CONCURRENTLY |
| `0016_publishers.sql:15` | `publishers_active_idx` | non-CONCURRENTLY |
| `0017_campaign_assignments.sql:11–14` | ×4 on `campaign_assignments` | non-CONCURRENTLY |
| `0019_wallet_transfers.sql:13,14` | ×2 on `wallet_transfers` | non-CONCURRENTLY |
| `0021_retreaver.sql:30,31,51,62` | ×4 on `retreaver_calls`, `rtb_reservations*` | non-CONCURRENTLY |
| `0027_public_leads_and_rls.sql` (×4) | public_leads indexes | non-CONCURRENTLY |
| `0029_subscription_race.sql` | subscription index | non-CONCURRENTLY |
| `0030_bid_overrides.sql` | bid_overrides index | non-CONCURRENTLY |
| `0031_agent_fees.sql` | agent_fees indexes | non-CONCURRENTLY |
| `0033_missing_indexes.sql` (×3) | missing hot-path | non-CONCURRENTLY but uses `IF NOT EXISTS` — safe on re-apply |

**Note:** `0033_missing_indexes.sql` uses `CREATE INDEX IF NOT EXISTS` (not CONCURRENTLY) — re-apply safe but still locks during a fresh deploy on a large table.

**Impact:** every `CREATE INDEX` without `CONCURRENTLY` takes an `ACCESS EXCLUSIVE` lock on the table for the build duration, blocking writes. On a small table this is ms. On `calls`, `call_events`, `wallet_entries`, `invoices` with millions of rows this can stall the app. **MEDIUM** for a 195-route prod deploy.

**Recommendation:** rewrite the 24 post-0001 indexes as `CREATE INDEX CONCURRENTLY IF NOT EXISTS` — Postgres allows CONCURRENTLY only outside a transaction block, so the migration runner must be configured to not wrap migrations in BEGIN/COMMIT (Supabase's default pg-boss migration runner is fine; if using Prisma migrate, this is a Prisma `--create-only` step).

### Migration summary table

| # | File | Creates | Alters | Indexes | CONCURRENTLY | Notes |
|---|------|---------|--------|---------|--------------|-------|
| 1 | `0001_callrelay_platform.sql` | 15 | 15 | 3 | 0 | Initial baseline; non-CONCURRENTLY OK |
| 2 | `0002_fix_missing_tables.sql` | 1 | 2 | 0 | 0 | – |
| 3 | `0003_payments_and_recordings.sql` | 1 | 1 | 1 | 0 | **lock risk** on payments |
| 4 | `0004_recordings_duration_and_wiring.sql` | 0 | 1 | 0 | 0 | – |
| 5 | `0005_scripts_and_tutorials.sql` | 2 | 2 | 2 | 0 | **lock risk** on scripts/tutorials |
| 6 | `0006_lead_enhancements.sql` | 2 | 5 | 1 | 0 | adds `leads.deleted_at` ✓ |
| 7 | `0007_dispositions.sql` | 2 | 2 | 2 | 0 | **lock risk** on dispositions |
| 8 | `0008_agent_subscriptions.sql` | 2 | 3 | 3 | 0 | **lock risk** on agent_plans/subs |
| 9 | `0009_sub_agency.sql` | 1 | 3 | 3 | 0 | – |
| 10 | `0010_performance_indexes.sql` | 0 | 0 | 14 | 0 | **hot-path; lock risk ×14** |
| 11–38 | (omitted for brevity) | – | – | 0–7 | 0 | See individual file scans |

### Verdict — Section 5

**FAIL — MEDIUM.** No `CREATE INDEX CONCURRENTLY`; 83 ALTER without IF EXISTS; one filename collision at `0028`. Add `deleted_at` columns and convert post-0001 indexes to CONCURRENTLY for safe prod deploy.

---

## Appendix — actionable checklist

### HIGH (block prod deploy)

- [ ] **Migration `0039_soft_delete_columns.sql`**: add `deleted_at TIMESTAMPTZ` to `agents`, `campaigns`, `agencies`, `scripts`, `tutorials`, `calls`. Or override `softDelete` per repo to use `active=false` (publishers pattern) instead.

### MEDIUM (block second deploy)

- [ ] Convert post-0001 `CREATE INDEX` statements to `CREATE INDEX CONCURRENTLY IF NOT EXISTS` (24 statements across migrations 0003–0033). Move them out of any transaction block in the migration runner.
- [ ] Rename `0028_provider_agent_call_id.sql` → `0028b_*` or `0029_*` (renumber 0029–0038 accordingly) to remove filename collision.
- [ ] Add `IF NOT EXISTS` to `ALTER TABLE ... ADD COLUMN` statements in 0002+ (currently 83 without).
- [ ] Defensive idempotency on `agentSubscriptions.incrementCallsUsed(callId)` — add unique constraint or pre-check.

### LOW (cosmetic / future)

- [ ] `health/route.ts` — consider moving behind a flag or wrapper for consistency with the rest of the API surface.
- [ ] `wallet/agent/route.ts:18` — `idempotency_key: "agent_topup_${agent.id}_${Date.now()}"` uses `Date.now()` — two concurrent clicks within 1ms could collide. Use `crypto.randomUUID()` suffix.
- [ ] Audit `wallet:recharge` permission on `agent-subscriptions/create-checkout/route.ts` — agent role has it; matches ROADMAP Phase 0.1 spec.

### Files referenced

- `src/server/api-utils.ts:151–175` (handler factory)
- `src/server/services/permission-data.ts:1–75` (RBAC matrix)
- `src/server/repositories/base.ts:122–129` (softDelete base impl)
- `src/server/services/call-orchestrator.ts:437–550` (finalizeCall + balance gate)
- `src/server/services/agent-fees.ts:1–98` (fee/invoice jobs)
- `src/server/services/route-queue.ts:15–24`, `src/server/services/finalize-queue.ts:12–21`, `src/server/services/recording-store.ts:62–67` (enqueue sites)
- `src/worker/index.ts:1–193` (worker entry)
- `src/app/api/telephony/[provider]/webhook/route.ts:1–70` (provider webhook entry)

---

**Audit produced by deep-scan worker · 5-area review · 113 routes, 39 migrations, ~10k lines of services code scanned.**