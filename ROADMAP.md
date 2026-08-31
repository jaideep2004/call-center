# CallRelay — Completion Roadmap

Follow phases **in order**. Do not start a later phase until the current one passes its Definition of Done.

**Definition of Done (every phase):**
- `npm run typecheck` clean
- `npm test` — all tests pass (live Telnyx integration tests may stay skipped)
- `graphify update .` after structural changes
- No new TODO/placeholder code shipped

**Legend:** CRITICAL / HIGH / MEDIUM

---

## Baseline (already done)

Phases 1–5 + 7 of `docs/plans/DEVELOPMENT_LIFECYCLE.md`: Stripe billing, recordings, softphone (Telnyx WebRTC), scripts/tutorials, disposition schema + admin review UI, reporting + export, lead enhancements, agent subscriptions/credits, Retreaver sync/RTB/publisher portal, RLS + indexes, claim-based call routing, pg-boss worker, Socket.IO gateway.

Known broken/incomplete: everything listed below.

---

## PHASE 0 — Security Blockers (CRITICAL — no feature work before this)

**STATUS: COMPLETE (2026-08-24)** — 317 tests passing, typecheck clean, verified per item.

### 0.1 Agent wallet minting — remove free money
- File: `src/app/api/v1/wallet/agent/route.ts:13`
- Move `wallet:recharge` out of the agent role in `src/server/services/permission-data.ts` (keep for finance/admin/super_admin).
- Accept: agent role POST to this endpoint returns 403.

### 0.2 Tenant-scope call CRUD (IDOR)
- Files: `src/app/api/v1/calls/[id]/route.ts:8,17,23`
- Pass `context.agencyId` into `calls.findById(id, agencyId)`, `calls.update(id, body, agencyId)`, `calls.softDelete(id, agencyId)`.
- Accept: user of agency A gets 404/403 for agency B call UUID.

### 0.3 State machine enforcement on PATCH
- Files: `src/server/validate.ts:118`, `src/app/api/v1/calls/[id]/route.ts`
- Change `updateCallSchema.state` from `z.string()` to `z.enum(callStates)`; validate with `assertTransition` before update.
- Accept: illegal transition (e.g. connected -> received) is rejected.

### 0.4 Disposition permission fix (CRITICAL — feature currently broken)
- File: `src/app/api/v1/calls/[id]/disposition/route.ts:48`
- Agent submit -> `{ resource: "calls", action: "update" }`; admin confirm keeps `manage`.
- Add agency scoping to `dispositions/[id]/confirm/route.ts` (findById + calls.findById with agencyId).
- Accept: agent can submit disposition; cross-agency confirm blocked.

### 0.5 Self-approval escalation
- File: `src/app/api/v1/agents/[id]/route.ts:14`
- Split schema: self-edit path allows `availability` only; managed path allows priority/approval_status/skills/etc.
- Accept: agent PATCHing own `approval_status` is rejected.

### 0.6 Hangup ownership check
- File: `src/app/api/v1/calls/[id]/hangup/route.ts`
- Mirror the accept route pattern (call must belong to the caller's agent membership).
- Accept: agent cannot hang up another agent's call.

### 0.7 Gateway authentication
- Files: `src/gateway/index.ts:29`, `src/lib/event-bridge.ts`, `src/lib/use-socket.ts`
- Validate `GATEWAY_PUBLISH_TOKEN` Bearer on `/publish`.
- Socket handshake: replace raw `membershipId` query param with short-lived signed ticket (HMAC of membershipId + expiry, secret shared with Next server; new endpoint `/api/v1/me/socket-ticket`).
- Accept: unauthenticated publish -> 401; bad ticket -> socket refused.

### 0.8 SQL injection via sortBy
- Files: `src/server/validate.ts:13`, `src/server/repositories/base.ts:68`
- Per-resource sort enums (zod) + column allowlist in `base.ts`.
- Accept: `?sortBy=started_at;--` fails validation.

### 0.9 make-admin bootstrap lock
- File: `src/app/api/v1/setup/make-admin/route.ts:21`
- Production without `SETUP_TOKEN` -> always 403 (fail closed).
- Accept: verified by test.

### 0.10 Stripe lazy init
- File: `src/server/stripe.ts:3`
- Export `getStripe()` factory; no module-scope throw.
- Accept: server boots without `STRIPE_SECRET_KEY`.

### 0.11 PII redaction in call_events
- File: `src/server/services/call-orchestrator.ts:68`
- Store only event type / call ids / timestamps in `raw_redacted` — never caller numbers.
- Accept: no raw phone numbers in `app.call_events`.

### 0.12 Ping-first accept/reject (CRITICAL — client requirement, rules now final)
Client rule: NEVER hang up the call ourselves. Respond to the publisher PING (Ping-Post/RTB) with accept or reject FIRST, based on: agent availability, caller state, campaign structure. On reject, pass the reason back to the publisher (`state_mismatch` / `no_agent_available`).

- Current gap: inbound flow early-answers the caller leg and self-cancels when routing fails (`call-orchestrator.ts:51-58, 341-408`) — violates the client requirement.
- Final rules (client Q7):
  1. Caller state from **3-digit area code (NPA)** — needs an NPA->state lookup table (migration + seed data).
  2. Ping evaluation: resolve campaign by DID -> NPA state -> check state in campaign's allowed states -> agent availability + eligibility (agent's state matches) — single fast SQL, target <300ms.
  3. Accept -> forward to available agent; Reject -> machine-readable reason payload to publisher. Never cancel legs ourselves for publisher flows.
  4. State mismatch -> do not route at all -> reject ping with `state_mismatch`. No agent available -> `no_agent_available`.
- Accept: Retreaver ping for unavailable campaign/state gets rejection reason; no call row created with a self-hangup; publisher receives the reason in their payload.

---

## PHASE 1 — Money Correctness (HIGH — billing must be provably right)

**STATUS: COMPLETE (2026-08-24)** — 321 tests passing, typecheck clean, migrations 0029 applied.

### 1.1 Idempotent agent charge
- Files: `src/server/repositories/agent-subscriptions.ts:40`, `src/server/services/call-orchestrator.ts:578`
- Guard `incrementCallsUsed` with claim, e.g. `UPDATE ... SET calls_used = calls_used + 1 WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM app.wallet_entries WHERE call_id = $2 AND agent_id = $3)`.
- Accept: double `finalizeCall` for same call increments exactly once (unit test).

### 1.2 Claim-guard the ended transition
- File: `src/server/services/call-orchestrator.ts:150`
- Use `claimState` (connected->ended) so concurrent caller/agent-leg hangup webhooks finalize exactly once.
- Accept: concurrent-webhook test.

### 1.3 Insufficient balance must not block finalization
- File: `src/server/services/call-orchestrator.ts:554`
- On insufficient agency balance: write invoice with status `failed`, mark call `disputed`, do NOT throw (never roll back call state).
- Accept: call reaches terminal state with failed invoice; webhook returns 200.

### 1.4 Wire finalize-call queue
- File: `src/server/services/call-orchestrator.ts:159`
- Enqueue `finalize-call` job on ended (worker already listens); keep inline path as fallback only if enqueue fails.
- Accept: pg-boss job visible in jobs table on call end.

### 1.5 Stripe subscription create race
- Files: `src/app/api/webhooks/stripe/route.ts:42`, new migration
- Add unique partial index: `agent_subscriptions(agent_id) WHERE status = 'active'`.
- Accept: duplicate webhook delivery creates exactly one active subscription.

### 1.6 Public lead phone-only conflict returns 409
- File: `src/app/api/v1/public/leads/route.ts:34`
- Handle both partial unique indexes (email_hash AND phone_hash) in ON CONFLICT.
- Accept: phone duplicate with new email -> 409 not 500.

---

## PHASE 1.5 — Call Connect Latency (CRITICAL for publisher logic)

**STATUS: COMPLETE (code side, 2026-08-24)** — 321 tests passing, typecheck clean.

Implemented:
- 1.5.1 Timing: `webhook_done` / `routing_queued` / `routing_done` JSON logs with elapsedMs + correlationId; ping route measurable via these too.
- 1.5.2 Early-answer is now fire-and-forget (no Telnyx API await on the webhook path).
- 1.5.3 Ping evaluation: single JOIN query (phone+campaign) + one agent query; NPA lookup served from in-memory cache (355 rows loaded once). No DID cache (JOIN is index-fast; caching risks accepting paused campaigns).
- 1.5.4 Worker: `useListenNotify` + queue `notify: true`, `pollingIntervalSeconds: 0.5` (pg-boss floor), `batchSize: 5`, burst-when-batch-full for route-call/finalize-call. NOTE: through a transaction-pooling proxy LISTEN/NOTIFY falls back to 500ms polling.
- 1.5.5 routeCall: single `findByCampaign` for both pstn/webrtc branches.
- 1.5.6 acceptCall: already timed (bridge ms + accept total); no redundant queries found.

**Live SLA verification (1.5.7) — MEASURED 2026-08-24 (webhook path):**
- Standalone probe (real DB, real DID, real agent): webhook processing **1322–1646ms** (median ~1.4s, warm). Includes full routeCall to an available agent. Expected call→agent-ringing ≈ 2.0–2.5s once Telnyx dial (~300-500ms) is added → **within the 3s target**.
- Remaining unmeasured: Telnyx ring/bridge legs (needs a live Telnyx call).
- NOTE: running dev server (PID 4388) executes stale modules — **restart `npm run dev`** or webhook POSTs return 400.
- pg deprecation warning seen: concurrent `client.query` in `routeCall`'s `Promise.all` (pg@9 will remove). Fix scheduled in Phase 3.

### 1.5.1 Measure first
- Add end-to-end timing (webhook received -> ping decision -> route -> ring -> accept -> bridge) logged with the existing `correlationId` (`telephony/[provider]/webhook/route.ts:58`).
- Produce a timing report per stage before optimizing anything. Baseline: 5-8s.

### 1.5.2 Remove synchronous network calls from the webhook hot path
- File: `src/server/services/call-orchestrator.ts:51-58`
- `provider.answer()` is awaited inline before routing — fire it in parallel with call creation/state update; do not block the ping/route decision on it.
- Accept: webhook returns without waiting for the Telnyx answer API call.

### 1.5.3 Ping evaluation must be one fast query
- Single SQL joining `phone_numbers -> campaigns -> agents` (availability, approval, eligibility) instead of sequential repository calls. Cache DID -> campaign config (in-memory TTL or Redis) since it changes rarely.
- Accept: ping decision path <300ms P95.

### 1.5.4 Reduce worker pickup latency (async routing)
- Files: `src/worker/index.ts`, `src/server/services/route-queue.ts`
- pg-boss defaults: lower `pollInterval` (e.g. 250-500ms), tune `batchSize`; measure enqueue -> worker start. If pickup adds >1s, route inline for the hot path.
- Accept: enqueue-to-pickup <500ms P95.

### 1.5.5 Collapse remaining sequential queries in routeCall
- File: `src/server/services/call-orchestrator.ts:220-339`
- `phoneNumbers.findByCampaign` runs in both branches; fetch once. Parallelize assignments + campaign + availability (already partially done).
- Accept: routeCall query count reduced; timing report shows improvement.

### 1.5.6 Accept -> bridge fast path
- File: `src/server/services/call-orchestrator.ts:597-641`
- Remove redundant agent re-fetch after bridge; keep bridge API call itself (unavoidable ~300-500ms).
- Accept: accept-to-connected <1s total.

### 1.5.7 Target SLA
- Ping response <500ms, call-arrival -> agent ringing <3s, accept -> audio bridged <1s. Re-measure with 1.5.1 tooling and close the gap until met.

---

## PHASE 2 — Feature Completion (backend + frontend together)

**STATUS: 17/17 COMPLETE (2026-08-25)** — 323 tests passing, typecheck clean, migrations 0030-0034 applied.
All items done. Handoff notes:
- 2.6 CMS: backend + admin editor + public feed (`GET /api/v1/cms`) are live; the homepage session wires their components to that endpoint (sections seeded: faq, privacy, terms, testimonials).
- 2.7: sub-admin = manager role (permission matrix already scopes every API); role-aware settings hub added.
- 2.11: rate limiter is now Redis-backed with in-memory fallback (set REDIS_URL to enable distributed mode).
- Deferred follow-ups: Stripe auto-recurring card charging for agent fees; provider-side recording deletion.

### 2.1 Agent wallet Stripe checkout (HIGH)
- Backend: `/api/v1/wallet/agent/create-checkout` + stripe webhook branch for agent top-ups (idempotency key = session id).
- Frontend: replace top-up POST UI on `/dashboard/wallet/agent` with Stripe redirect.
- Accept: agent pays, webhook credits wallet, entry visible in agent wallet history.

### 2.2 Support tickets (lifecycle #30)
- Migration: `app.support_tickets` (agency_id, requester_membership_id, assignee, subject, status, priority, timestamps) + RLS.
- API: `/api/v1/support/tickets` (create/list) + `[id]/reply` + `[id]/close`.
- Frontend: `/dashboard/support` (agent) + `/dashboard/admin/support` (admin queue).
- Accept: agent opens ticket, admin replies, agent sees reply.

### 2.3 Real-time notifications (lifecycle #31)
- Backend: publish `notification:new` via `event-bridge` when DB notification row is created.
- Frontend: socket listener in dashboard layout + unread badge on Notifications nav item.
- Accept: notification appears live without refresh.

### 2.4 Publisher portal completion (HIGH)
- Pending pages: `/dashboard/publisher/payouts` (ledger of qualified calls + payout totals), `/dashboard/publisher/settings` (profile, email), recording playback links on `/dashboard/publisher/calls`.
- API: `/api/v1/publisher/payouts`.
- Accept: publisher sees per-campaign payout history and can play recording links.

### 2.5 Sub-agency end-to-end (lifecycle #26–29)
- Verify recruit invite accept flow: `/dashboard/agents/recruit` -> invite link -> register -> auto-added to sub-agency.
- Wire revenue share UI (commission_rate display) on admin agencies page.
- Accept: recruited agent lands in sub-agency; disposition payout splits commission to parent.

### 2.6 CMS (lifecycle #20–21) — coordinate with homepage agent
- Migration: `app.cms_sections` (slug, agency_id null = global, content jsonb).
- API: `/api/v1/cms` (public GET, admin CRUD) + `/dashboard/admin/cms` editor page.
- Public pages read from DB instead of hardcoded copy.
- Accept: editing a section in admin updates the public homepage.

### 2.7 Admin enhancements (lifecycle #32–36)
- `/dashboard/admin/revenue` — revenue report page with charts (reuse reports API).
- Sub-admin scoped views — role-scoped `/dashboard/sub-admin/*` nav + permission checks.
- Per-role settings — finance settings page, agent settings page.
- Accept: each page reachable only by permitted roles.

### 2.8 Recording purge worker
- Worker job: delete recordings past `purge_at` (provider delete where supported + DB row).
- Accept: expired recording removed from storage and DB.

### 2.9 Missing indexes (PERF)
- Migration: `calls(provider, provider_agent_call_id)`, `phone_numbers(campaign_id)`, `retreaver_calls(caller_hash, dialed_hash, start_time)`.
- Accept: indexes present in DB; explain plans hit them.

### 2.10 Agent nav: add Scripts + Tutorials links
- File: `src/app/dashboard/layout.tsx:11` agentNav.
- Accept: pages reachable from sidebar (currently orphaned).

### 2.11 Distributed rate limiter (PERF)
- File: `src/server/rate-limit.ts` — Redis-backed for multi-instance.
- Accept: limits hold across instances.

### 2.12 Stripe payment gateway completeness (HIGH — umbrella)
**STATUS: COMPLETE (2026-08-25)** — agent top-up checkout + webhook branch added (2.1); subscription checkout permission fixed (was `agents:manage` → agents could never buy a plan, now `wallet:recharge`); all three money-in paths idempotent (session-id key + status guard + 23505 catch).
- PROD ENV REQUIREMENTS: `GATEWAY_PUBLISH_TOKEN` (without it the gateway refuses /publish → no live call notifications) and `SETUP_TOKEN` (without it make-admin is locked in prod — set it deliberately).

### 2.13 Caller state UI (client Q1) (HIGH)
- Show caller state (derived from 3-digit NPA) on: **Take Calls screen**, **call-arrival popup**, **call logs page**.
- Backend: include `caller_state` on call rows + realtime event payloads (derived in 0.12 ping evaluation).
- Accept: agent sees caller state in all three places during/after a live call.

### 2.14 Per-campaign pricing engine (client Q2/Q4) (HIGH)
- Replace flat `price_cents` usage with campaign-level price + publisher payout + **manual bid adjustment** (no schedule — admin edits bid whenever call volume is low).
- Data model: `campaigns.price_cents` (what agents pay), publisher payout (already `publishers.fixed_price_cents`), new `campaign_bid_overrides` (admin manual bid, effective immediately).
- Accept: admin changes bid in UI -> next ping uses new price with zero deploy/wait.

### 2.15 Routing balance gate (client Q2) (HIGH)
- File: `src/server/services/call-orchestrator.ts:250` (currently hardcoded `walletEligible: true`)
- Implement real eligibility: agent balance >= campaign price, else skip; prepaid agents first, postpaid only when no prepaid eligible.
- Accept: agent with balance below campaign price is never routed; rejection reason logged in routing snapshot.

### 2.16 Recurring fees + labels (client Q3/Q5) (HIGH)
- Postpaid agents: **"Dialer Fee"** — $50/month default, adjustable per agent; auto-charge via Stripe subscription.
- Prepaid agents: **"Software Access"** — adjustable monthly fee; UI copy must say "Software Access" (never "Dialer Fee" for prepaid).
- Keep monthly plans (call allowances) as-is; fees are separate subscription charges.
- Accept: fee charged monthly with correct label per agent type; failed charge flagged to admin.

### 2.17 Monday invoicing + agent controls (client Q6) (HIGH)
- Worker job: every **Monday** auto-generate postpaid agent invoice (usage from previous week), visible to admin only.
- Admin manually sends invoice to agency (no auto-email).
- Admin controls: block agent from calls / pause / terminate account (UI + API, reflected in routing eligibility immediately).
- Accept: Monday job generates invoice rows; blocked agent is skipped in routing within the next ping.

---

## PHASE 3 — Hardening & Cleanup

**STATUS: COMPLETE (2026-08-25)** — 328 tests passing, typecheck clean.

- Route audit: fixed unscoped access in `campaigns/[id]` (GET/PATCH/DELETE), `leads/[id]` (GET/PATCH/DELETE), `memberships/[id]` (GET/PATCH), `agents/[id]` DELETE + managed-path update. Verified already-safe: agency route (context id), feature-requests/skills (global), publishers (platform-managed), invoices/scripts/tutorials/agent-plans (scoped), accept/disposition-confirm (ownership/platform-guarded).
- pg concurrent-query warning fixed in routeCall (sequential inside transactions, parallel on pool).
- permission.service duplicate import removed.
- Stripe webhook idempotency test suite added (5 tests: duplicate delivery, already-completed, missing/invalid signature, agent top-up binding).
- Misc verification: `.env.example` exists; DB migrations 0028–0034 verified live (355 NPAs, all tables/indexes/columns present); note: `.git` is an empty dir — repo is NOT under version control on this machine.

---

## CLIENT DECISIONS (FINAL — all 7 answered, see `docs/plans/StateWiseRouting.md`)

1. Caller state UI: Take Calls screen + arrival popup + call logs page (item 2.13)
2. Per-campaign pricing (campaign / publisher / bidding knobs); agent balance below campaign price -> skip (items 2.14, 2.15)
3. Postpaid = "Dialer Fee" $50/mo/agent adjustable; Prepaid = adjustable monthly "Software Access" (item 2.16)
4. No bidding schedule — admin manually adjusts bids when call volume is low (item 2.14)
5. Fee labels final: Postpaid "Dialer Fee", Prepaid "Software Access" (item 2.16)
6. Monday auto-generate postpaid invoice visible to admin; admin sends to agency manually; admin can block / terminate / pause agents (items 2.16, 2.17)
7. 3-digit area code (NPA) -> state; mismatch vs campaign allowed states -> reject ping with reason; ping-first always (item 0.12)

---

## Pending Frontend / Dashboard Pages (explicit list)

### Admin (missing)
- `/dashboard/admin/support` — ticket queue (Phase 2.2)
- `/dashboard/admin/revenue` — revenue report (Phase 2.7)
- `/dashboard/admin/cms` — CMS editor (Phase 2.6)
- `/dashboard/admin/dispositions` — exists; needs agency-scope fix + per-agent summary
- Sub-admin scoped views — folder absent (Phase 2.7)

### Agent (missing)
- `/dashboard/support` — tickets (Phase 2.2)
- Scripts/Tutorials pages exist but not linked in nav (Phase 2.10)
- Wallet page needs Stripe checkout UI (Phase 2.1)

### Publisher (missing)
- `/dashboard/publisher/payouts` (Phase 2.4)
- `/dashboard/publisher/settings` (Phase 2.4)
- Recording playback on calls page (Phase 2.4)

### Public
- CMS-driven homepage sections (Phase 2.6 — coordinate with homepage session)

---

## Execution Order

1. Phase 0 (all items, in numbered order) — includes 0.12 ping-first accept/reject (unblocked: NPA rule confirmed)
2. Phase 1 (1.1 -> 1.4 -> 1.2 -> 1.3 -> 1.5 -> 1.6)
3. Phase 1.5 — call connect latency (after 1.3, before new features; re-verify SLA)
4. Phase 2: 2.1 -> 2.12 -> 2.13 -> 2.14 -> 2.15 -> 2.16 -> 2.17 -> 2.2 -> 2.3 -> 2.4 -> 2.5 -> 2.6 -> 2.7 -> 2.8 -> 2.9 -> 2.10 -> 2.11
5. Phase 3

All client questions are answered — nothing is blocked. Build routing/billing strictly against the CLIENT DECISIONS section.

### 2.18 Script dynamic variables — client Final Expense framework (NEW 2026-08-27)
- Client doc: https://docs.google.com/document/d/1m46V_oTGZvoAJC9t_xfCGWqOb1iUfNXMzbvH0x-JNiA (FINAL EXPENSE SALES FRAMEWORK) uses vars like `[Your Name]`, `[State]`, `[Phone]`, `[NPN]`, `[Beneficiary]`.
- Current: `src/server/services/script-renderer.ts` supported only `{{var}}` ({{agent_name}}, {{state}} etc) — rendered in `src/components/softphone.tsx` overlay.
- Update: renderer now supports **both** `{{var}}` and `[Your Name]` bracket styles with alias map (your name/agent name/name → agent_name, state/your state/caller state → state, phone/phone number → phone, etc). Verified softphone overlay fills from `agentProfile` + `incoming.fromHash` before `call:connected`.
- Content authoring: Admin creates script in `/dashboard/scripts/new` with bracket vars; agent sees rendered script on incoming call via softphone overlay (left-bottom card). Add hint text on new-script page listing supported vars.
- Accept: script content `Hello [Your Name] from [State] NPN {{npn}}` with agent `John, CA, 12345` renders as `Hello John from CA NPN 12345`.

Each item = one commit-sized unit. Verify (typecheck + tests) before moving to the next item.
