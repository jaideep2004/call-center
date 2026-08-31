# Call Center — Full A-Z Test Checklist

> Generated 2026-08-27 — covers every module in `ROADMAP.md` + all 139 routes found in `npm run build`
> Run Order: **Layer 1 automated** -> **Layer 2 manual by role** -> **Layer 3 security/edge**
> Stack: Next.js 16 + Postgres (app/jobs schemas) + pg-boss + Socket.io + Telnyx + Stripe + Retreaver + Better Auth

**Pre-flight status 2026-08-27:**
- `npm run typecheck` ✅ clean
- `npm test` ✅ 31 files — 328 passed / 5 skipped (live Telnyx needs `TELNYX_API_KEY`)
- `npm run build` ✅ 139 routes — 80 API + 59 pages

---

## 0) Environment & Boot (do first)

- [ ] **0.1** `.env` exists from `.env.example` — `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` set
- [ ] **0.2** `npm run migrate` — all 34 migrations applied (`0001_callrelay_platform.sql` -> `0034_cms_sections.sql`) — verify `SELECT count(*) FROM app.npa_states` = 355
- [ ] **0.3** `npm run seed` — demo agencies / campaigns / phone_numbers seeded
- [ ] **0.4** Three processes start clean: `npm run dev` (3000), `npm run worker` (pg-boss), `npm run gateway` (3001) — no crash without `STRIPE_SECRET_KEY` (lazy `getStripe()` fix 0.10)
- [ ] **0.5** Stripe keys: either `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` in `.env` OR Admin → `/dashboard/admin/settings` → Integrations (encrypted) — `GET /api/v1/settings/stripe` returns `{configured: true}`
- [ ] **0.6** Telnyx keys: `TELNYX_API_KEY`, `TELNYX_CONNECTION_ID`, `TELNYX_PUBLIC_KEY` set — mock provider still works without them
- [ ] **0.7** Realtime: `REDIS_URL` + `GATEWAY_PUBLISH_TOKEN` set — otherwise `/publish` is 403 in prod
- [ ] **0.8** `npm run typecheck && npm test` both green before manual QA

---

## 1) Public / Unauthenticated

- [ ] **1.1** `GET /` — homepage loads (frontend worker owns this — skip pixel checks here)
- [ ] **1.2** `GET /faq`, `/contact`, `/how-it-works`, `/privacy`, `/terms`, `/testimonials`, `/pricing`, `/why-choose-us` — CMS-driven, not hardcoded
- [ ] **1.3** `GET /how-it-works`, `/faq` — content matches `app.cms_sections` (edit in `/dashboard/admin/cms` -> public page updates instantly)
- [ ] **1.4** `POST /api/v1/public/leads` — create with `email_hash` + `phone_hash` → 201
- [ ] **1.5** Duplicate `phone_hash` with new `email_hash` → **409** not 500 (partial unique index fix 1.6)
- [ ] **1.6** Spam 100x `POST /api/v1/public/leads` quickly → 429 (Redis-backed rate limiter `2.11` — falls back to in-memory if `REDIS_URL` missing)
- [ ] **1.7** `GET /api/v1/cms?slug=faq` — public GET works without auth; `POST /api/v1/cms/admin` without admin → 403

---

## 2) Auth & Onboarding (Better Auth)

- [ ] **2.1** Register at `/register` → verification email sent (if `SMTP_*` set) → verify link → auto sign-in
- [ ] **2.2** Login at `/login` → session cookie `httpOnly, sameSite=lax, secure in prod`
- [ ] **2.3** Forgot password `/forgot-password` → reset email → reset at `/reset-password` → login with new password
- [ ] **2.4** Access `/dashboard` without session → redirect to `/login`
- [ ] **2.5** `POST /api/v1/setup/make-admin` without `SETUP_TOKEN` in prod → **403** (fail closed — fix 0.9); with token or before first super_admin exists → creates `super_admin`
- [ ] **2.6** `/setup` wizard — create agency after first login

---

## 3) Agencies, Memberships, RBAC

- [ ] **3.1** `super_admin` → `/dashboard/admin/agencies` → create agency (check `app.agencies` row)
- [ ] **3.2** Invite `manager`/`agent` via `POST /api/v1/memberships/invite` → email → accept `GET /api/v1/invites/[token]/accept` → `app.memberships` row `status=active`
- [ ] **3.3** Permission matrix: `agent` cannot `GET /api/v1/agencies` of another agency (RLS `app.current_agency_id()` — fix 0.2/3.x)
- [ ] **3.4** `PATCH /api/v1/agents/[id]` as agent on self — can change `availability` only; try `approval_status: approved` → **403** (fix 0.5)
- [ ] **3.5** `DELETE /api/v1/agents/[id]` tenant-scoped — cross-agency delete → 404
- [ ] **3.6** Sub-agency: `/dashboard/agents/recruit` → copy invite link → new user registers → auto-added to parent's sub-agency → verify `app.agencies.parent_id` + `commission_rate` shown on admin agencies page
- [ ] **3.7** Role nav: `agent` sees `Scripts` + `Tutorials` in sidebar (fix 2.10); `finance` sees `Fees`/`Invoices`; `manager` sees sub-admin scoped views

---

## 4) Campaigns & Phone Numbers

- [ ] **4.1** Create campaign `POST /api/v1/campaigns` with `target_states`, `required_license`, `required_skills`, `allowed_endpoints: [webrtc,pstn]`, `routing_strategy: priority|round_robin`, `price_cents`, `buffer_seconds`, `min_connected_seconds`
- [ ] **4.2** `PATCH /api/v1/campaigns/[id]/bid` as admin → bid override effective **immediately** on next `evaluatePing` (no deploy)
- [ ] **4.3** Assign agents via `POST /api/v1/campaigns/[id]/assignments` → only assigned agents route when assignments exist
- [ ] **4.4** `GET /api/v1/campaigns/[id]` cross-agency → 404 (fix Phase 3 route audit)
- [ ] **4.5** Phone numbers: `POST /api/v1/phone-numbers` → `app.phone_numbers` linked to campaign → `GET /api/telephony/[provider]/webhook` returns `ready` on GET

---

## 5) Call Lifecycle — Core Routing (THE CRITICAL PATH)

> Use **mock provider** for free tests (no Telnyx cost). Real Telnyx tests need `TELNYX_*` env.

- [ ] **5.1** Inbound mock webhook:
  ```bash
  curl -X POST http://localhost:3000/api/telephony/mock/webhook \
    -H "x-telephony-signature: test" -H "x-telephony-timestamp: 123" \
    -H "Content-Type: application/json" \
    -d '{"eventId":"evt-inbound-1","type":"inbound","callId":"prov-1","from":"+12145551234","to":"+18005550100","occurredAt":"2026-08-27T10:00:00Z"}'
  ```
  → 202, `app.calls` row `state=routing` then `ringing` with `agent_id` set, `app.call_events` redacted (no raw phone)

- [ ] **5.2** State machine: `PATCH /api/v1/calls/[id]` try illegal `connected → received` → **400** (fix 0.3 + `assertTransition`)

- [ ] **5.3** Tenant IDOR: Agency A user `GET /api/v1/calls/<B-call-id>` → 404/403 (fix 0.2 — must pass `agencyId`)

- [ ] **5.4** **PII redaction**: `SELECT raw_redacted FROM app.call_events` — contains no `from`/`to`/`caller_number` (fix 0.11)

- [ ] **5.5** **Ping-first** (client Q7 / fix 0.12): `POST /api/webhooks/retreaver/ping` with DID + caller NPA `214` (TX):
  - state mismatch vs `campaign.target_states` → reject `{reason: state_mismatch}`, NO call row with self-hangup, no `provider.cancel`
  - no agent available → reject `{reason: no_agent_available}`
  - match → accept → forward to agent → verify `routing_snapshot` has reason

- [ ] **5.6** Routing tier priority: Fund prepaid agent A (`wallet_cents >= price_cents`) + postpaid agent B (subscription) — inbound always picks **A first** (Tier 1 > Tier 2) — verify `selectAgent` + `routeCall` logs `tier=1`

- [ ] **5.7** Balance gate (fix 2.15): Agent balance below `campaign.price_cents` → skipped, `routing_snapshot.rejected[agentId]=["wallet_ineligible"]`

- [ ] **5.8** Failover: Agent leg `ended` while `ringing` → `handleNoAnswer` dials next eligible agent (no `release`/`charge` yet)

- [ ] **5.9** Duplicate job safety: Enqueue 2x `route-call` for same `callId` → 2nd logs `skip state=ringing (not routing — duplicate)` and does NOT dial (claim `routing→ringing` with `ring_started_at`)

- [ ] **5.10** Ring timeout: Set `campaigns.ring_timeout_seconds=10` → leave call `ringing` 15s → `expireRingingCalls` (every 30s, advisory lock) triggers `handleNoAnswer(timeout)`

- [ ] **5.11** Orphan safety: `state=ringing AND agent_id IS NULL AND ring_started_at < now-45s` → sweeper marks `missed` (call-cleanup 41-45)

- [ ] **5.12** Stuck routing: Leave call `routing` for 90s → `requeueStuckRoutingCalls` bumps `routing_snapshot.routing_requeues` and re-enqueues; after 3 tries → `missed` with `stuck: requeue_exhausted`

- [ ] **5.13** Early answer non-blocking: `provider.answer()` is fire-and-forget — webhook `webhook_done` log shows `elapsedMs` < 1.6s warm (Phase 1.5 — target ping <500ms, call→ringing <3s)

- [ ] **5.14** `GET /api/v1/calls?state=ringing,connected&limit=5` — live queue for dashboard

- [ ] **5.15** `GET /api/v1/calls?sortBy=started_at;--` → **400** validation (fix 0.8 — column allowlist)

---

## 6) Softphone / Take Calls (Agent Browser Phone)

- [ ] **6.1** Agent `GET /api/v1/me/sip-credentials` → receives `TELNYX_WEBRTC_SIP_USER @ TELNYX_WEBRTC_SIP_REALM`
- [ ] **6.2** Open `/dashboard/take-calls` (2 browsers: Agent + Admin) — softphone UI loads, `use-telnyx-webrtc` connects, shows `Available` toggle + `caller_state` badge (NPA → state, fix 2.13)
- [ ] **6.3** Trigger inbound (5.1) → Agent sees **call-arrival popup** with caller state + campaign name + Answer/Reject
- [ ] **6.4** Click **Answer** → `POST /api/v1/calls/[id]/accept` → `provider.bridge` → call `connected` → timer starts → `connected_at` set → `accept total <1s` (Phase 1.5.6)
- [ ] **6.5** Click **Reject** → `POST /api/v1/calls/[id]/reject` → call `missed`/`failed` without billing
- [ ] **6.6** During `connected`: Mute / Hold / Keypad / End Call buttons work; End → `POST /api/v1/calls/[id]/hangup` → hangup ownership check (fix 0.6 — cannot hangup another agent's call)
- [ ] **6.7** Verify no concurrent `client.query` deprecation warning in `routeCall` logs (Phase 3 fix — sequential inside tx)

---

## 7) Wallet, Billing, Invoices, Payouts (Money Must Be Right)

- [ ] **7.1** **Agency top-up** (admin/manager/finance only): `POST /api/v1/wallet/create-checkout {amount_cents: 5000}` → returns `url` → complete Stripe test card `4242...` → webhook `checkout.session.completed` → `app.payments status=completed` → `app.wallet_entries type=top_up amount_cents=5000 idempotency_key=stripe_cs_...` → `/dashboard/wallet` shows entry
- [ ] **7.2** **Agent top-up** (agent): `POST /api/v1/wallet/agent/create-checkout {amount_cents: 2500}` → same → `wallet_entries` row has `agent_id` set → `/dashboard/wallet/agent` shows entry + Stripe success redirect
- [ ] **7.3** Try old vector: agent `POST /api/v1/wallet/agent {amount_cents: 99999}` → **403** (permission `wallet:recharge` removed from agent role — fix 0.1)
- [ ] **7.4** Idempotency: Replay same `checkout.session.completed` webhook twice → 2nd returns `200 received: true`, only **1** wallet entry, `markCompleted` called once (test `stripe webhook — agency top-up idempotency`)
- [ ] **7.5** Invalid Stripe webhook: missing `stripe-signature` → 401; bad sig → 401
- [ ] **7.6** Billing math: Connect call 70s, `buffer=30, price=10c/s` → `billable=40s → total=400c` (`billing.test.ts`); Connect 5s with buffer 30 → 0 billable → 0 charge
- [ ] **7.7** Minimum charge: `connectedSeconds = buffer+1` → at least `10 * pricePerSecond` cents
- [ ] **7.8** Insufficient balance on `finalizeCall` → `invoice status=failed`, `call state=disputed`, webhook **200** (not thrown — fix 1.3), never rolls back call state
- [ ] **7.9** Claim-guard double finalize: Call `finalizeCall` twice concurrently → increments `agent_subscriptions.calls_used` **once** only (fix 1.1 — `NOT EXISTS wallet_entries` guard)
- [ ] **7.10** Concurrent hangup: Fire caller-leg `ended` + agent-leg `ended` at same time → `claimState(connected→ended)` ensures **exactly one** finalize (fix 1.2)
- [ ] **7.11** `finalize-call` queue: On `ended`, `jobs` table has `finalize-call` row; worker processes it (localConcurrency 6)
- [ ] **7.12** Subscription race: Fire duplicate `checkout.session.completed` for subscription → unique partial index `agent_subscriptions(agent_id) WHERE status=active` (0029) → 2nd insert 23505 caught as success
- [ ] **7.13** Agent fees (Phase 2.16): `generateMonthlyFees()` on 1st of month → postpaid `Dialer Fee $50` (adjustable per agent) + prepaid `Software Access` fee (different label) → admin `/dashboard/admin/fees` shows fees with correct labels
- [ ] **7.14** Weekly invoicing (client Q6): Trigger `generateWeeklyInvoices()` (Monday 00:00 job) → aggregates fees into `app.invoices` per agency → admin manually sends (no auto-email) → `/dashboard/wallet/invoices` shows invoice
- [ ] **7.15** Admin controls: Block agent (`approval_status=suspended` or `availability=offline`) → next `evaluatePing`/`routeCall` skips blocked agent immediately
- [ ] **7.16** Wallet transfers: `POST /api/v1/wallet/transfer` + `GET /api/v1/wallet/transfers` + balance `GET /api/v1/wallet/balance` reflect top_up/charge/refund ledger correctly
- [ ] **7.17** Subscriptions: `POST /api/v1/agent-subscriptions/create-checkout` as agent with `wallet:recharge` (fixed from `agents:manage` bug 2.12) → checkout → webhook creates `agent_subscriptions`

---

## 8) Recordings

- [ ] **8.1** On `connected`, Telnyx `recording.saved` → `recording_ready` event → `store-recording` job (concurrency 3, retry 2/3s) → download from Telnyx → upload to Supabase Storage `recordings` bucket → `app.recordings` row with `purge_at`
- [ ] **8.2** `GET /api/v1/recordings/[id]/download` — serves file (check `contentType`)
- [ ] **8.3** Expired purge: Set `purge_at = now() - 1 day` → run `purgeExpiredRecordings()` (daily 02:00 job) → storage deleted + DB row removed
- [ ] **8.4** `/dashboard/recordings` — playback links visible to permitted roles; publisher sees allowed recordings on `/dashboard/publisher/calls`

---

## 9) Leads, Timeline, Disposition, Payouts

- [ ] **9.1** CRUD: `POST /api/v1/leads`, `GET /api/v1/leads`, `GET /api/v1/leads/[id]`, `PATCH`, `DELETE` — all tenant-scoped (cross-agency 404)
- [ ] **9.2** Timeline: `POST /api/v1/leads/[id]/timeline` + `notes` + `tags` → `GET /api/v1/leads/[id]/timeline` shows history
- [ ] **9.3** Assign agent: `PATCH /api/v1/leads/[id] {assigned_agent_id}` → agent sees lead on `/dashboard/leads`
- [ ] **9.4** **Disposition submit** (fix 0.4): Agent `POST /api/v1/calls/[id]/disposition` with `{resource: calls, action: update}` → **200** (was broken as `manage`)
- [ ] **9.5** Admin confirm: `POST /api/v1/dispositions/[id]/confirm` with `manage` + agency scoping — cross-agency confirm → blocked
- [ ] **9.6** Disposition payout: Confirm triggers `app.disposition_payouts` → revenue share to parent agency via `commission_pct` (verify `revenue-sharing.test.ts`)
- [ ] **9.7** Export: `GET /api/v1/calls/export` + `GET /api/v1/leads/export` → CSV/XLSX download (check `csv.test.ts` + `excel.ts`)
- [ ] **9.8** Lead enhance: `is_premium` flag and `GET /api/v1/leads/sources` work

---

## 10) Scripts, Tutorials, Skills, Features, Affiliates

- [ ] **10.1** `GET /api/v1/scripts` → list; `POST` as admin → create; `/dashboard/scripts` + `/dashboard/scripts/[id]` renders + `script-renderer.test.ts`
- [ ] **10.2** `GET /api/v1/tutorials` + `/dashboard/tutorials` — linked from agent nav (fix 2.10)
- [ ] **10.3** Skills: `GET /api/v1/skills`, `POST /api/v1/skills`, `PATCH /api/v1/skills/[id]` — global (no agency scope) but permission gated
- [ ] **10.4** Feature requests: `GET /api/v1/feature-requests`, `POST`, `PATCH /api/v1/feature-requests/[id]` (admin)
- [ ] **10.5** Affiliate: `GET /api/v1/affiliates`, `POST`, `GET /api/v1/affiliates/[id]/earnings`, `/dashboard/affiliate` page
- [ ] **10.6** Agent earnings: `GET /api/v1/agents/earnings` + `/dashboard/agents/earnings`, top-performers `GET /api/v1/agents/top-performers` + `/dashboard/agents/top-performers`

---

## 11) Publishers & Retreaver (External Publisher Marketplace)

- [ ] **11.1** `POST /api/v1/publishers` → create → `app.publishers` row `retreaver_status=unprovisioned`
- [ ] **11.2** `POST /api/v1/retreaver/provision` → provisions to Retreaver (needs `RETREAVER_API_KEY` + `COMPANY_ID`) → status `active` or `error`
- [ ] **11.3** `GET /api/v1/retreaver/status` → health check `{configured, ok, latency_ms}`
- [ ] **11.4** Sync: `POST /api/v1/retreaver/sync` or worker `sync-retreaver-calls` (every 10m) → `app.retreaver_calls` rows; opportunistic `tryLinkRetreaverCall()` by `cid` or dialed number
- [ ] **11.5** Link jobs: `link-retreaver-calls` every 5m + `expire-rtb-reservations` every 5m
- [ ] **11.6** Webhooks: `POST /api/webhooks/retreaver` with `RETREAVER_WEBHOOK_SECRET` token → upsert + link; missing token → 401
- [ ] **11.7** RTB ping: `POST /api/webhooks/retreaver/ping` — accept/reject with budget checks (Phase 2.14/2.15)
- [ ] **11.8** Publisher portal: `/dashboard/publisher` overview (total/qualified calls, payout), `/dashboard/publisher/calls` (paginated), `/dashboard/publisher/payouts` (ledger + monthly buckets — fix 2.4), `/dashboard/publisher/settings` (profile + email), `/dashboard/publisher/campaigns`
- [ ] **11.9** Publisher invite: `POST /api/v1/publishers/[id]/invite` → 24-byte hex token → accept via `POST /api/v1/invites/[token]/accept` → sets `user.role=publisher`, links `publishers.user_id`, checks already-linked/membership conflicts

---

## 12) Reports, Revenue, System Settings

- [ ] **12.1** Reports: `GET /api/v1/reports/summary`, `/calls-volume?days=7`, `/duration?days=7`, `/revenue?days=7`, `/conversion?days=7` → data for `/dashboard` + `/dashboard/reports` + `/dashboard/admin/revenue`
- [ ] **12.2** Export reports: `GET /api/v1/reports/export/calls` → CSV
- [ ] **12.3** Admin revenue: `/dashboard/admin/revenue` — charts reuse reports API, role-gated (finance/admin/super_admin)
- [ ] **12.4** System settings: `GET /api/v1/settings/system` + `POST /api/v1/settings/stripe` as `super_admin` → encrypts keys, `invalidateStripeCache()` — live Stripe client picks up new keys within 60s (or immediately)

---

## 13) Support Tickets & Notifications (Real-time)

- [ ] **13.1** Agent `POST /api/v1/support/tickets` → create ticket → appears in `/dashboard/support`
- [ ] **13.2** Admin `GET /api/v1/support/tickets` queue at `/dashboard/admin/support` → reply `POST /api/v1/support/tickets/[id]/reply` → close `POST .../close`
- [ ] **13.3** On ticket reply, `app.notifications` row created → `event-bridge` publishes `notification:new` via Redis `call:events` → dashboard socket listener shows **unread badge** without refresh (fix 2.3) — verify with 2 browsers
- [ ] **13.4** Gateway auth: `POST /publish` without `Authorization: Bearer GATEWAY_PUBLISH_TOKEN` → 401 in prod (fix 0.7); socket handshake uses signed ticket from `POST /api/v1/me/socket-ticket` (HMAC with expiry), bad ticket → socket refused

---

## 14) Campaign Assignments, Routing Simulation, Health

- [ ] **14.1** `POST /api/v1/campaigns/[id]/assignments` — assign agencies/agents to campaign gate
- [ ] **14.2** `POST /api/v1/routing/simulate {campaign_id, from_state}` → returns `eligible` agents without side effects
- [ ] **14.3** `GET /api/v1/health` → 200
- [ ] **14.4** Invoices: `GET /api/v1/invoices`, `GET /api/v1/invoices/[id]`, `/dashboard/wallet/invoices` — tenant-scoped

---

## 15) Security & Hardening (Phase 0 + Phase 3)

- [ ] **15.1** Run `npm run typecheck` + `npm test` — must be zero new failures (328 baseline)
- [ ] **15.2** Verify `.env.example` has all required keys documented
- [ ] **15.3** Try IDOR on every `GET /api/v1/calls/[id]`, `/leads/[id]`, `/campaigns/[id]`, `/memberships/[id]` across agencies → all 404/403
- [ ] **15.4** Try privilege escalation: agent self-patch `approval_status`, hangup not-owned call, submit disposition with wrong permission — all blocked
- [ ] **15.5** Confirm no raw phone numbers in `app.call_events.raw_redacted` or logs (`WEBHOOK_DEBUG=1` logs only `webhook_done` with `correlationId`)
- [ ] **15.6** Confirm `.git` is empty dir warning from Phase 3 still true — init git + push if needed

---

## 16) Performance & Worker SLOs (Phase 1.5)

- [ ] **16.1** Webhook → ping decision → `routing_queued` → `routing_done` logs show `correlationId` + `elapsedMs` chain; warm path ~1.3-1.6s to `routeCall` complete → ~2.0-2.5s to agent ringing (target <3s)
- [ ] **16.2** `pollingIntervalSeconds=0.5 + useListenNotify + burstWhenBatchFull` on `route-call`/`finalize-call` queues — enqueue-to-pickup <500ms P95
- [ ] **16.3** Check `jobs` schema queues exist: `route-call`, `finalize-call`, `store-recording`, `sync-retreaver-calls`, `link-retreaver-calls`, `expire-ringing-calls`, `expire-rtb-reservations`, `generate-agent-fees`, `generate-weekly-invoices`, `purge-expired-recordings` + scheduled cron entries
- [ ] **16.4** `EXPLAIN` on `phone_numbers(campaign_id)`, `calls(provider, provider_agent_call_id)`, `retreaver_calls(caller_hash, dialed_hash)` — hits indexes (fix 2.9)

---

## Quick Smoke Script (optional)

```bash
# 1) typecheck + tests + build
npm run typecheck && npm test && npm run build

# 2) mock inbound call (no Telnyx cost)
curl -X POST http://localhost:3000/api/telephony/mock/webhook \
  -H "x-telephony-signature: test" -H "Content-Type: application/json" \
  -d '{"eventId":"smoke-1","type":"inbound","callId":"smoke-prov-1","from":"+12145551234","to":"+18005550100"}' | jq .

# 3) Stripe webhook idempotency replay (needs stripe CLI)
stripe listen --forward-to localhost:3000/api/webhooks/stripe &
stripe trigger checkout.session.completed

# 4) DB assertions
psql $DATABASE_URL -c "SELECT state, agent_id FROM app.calls ORDER BY started_at DESC LIMIT 5;"
psql $DATABASE_URL -c "SELECT type, amount_cents, idempotency_key FROM app.wallet_entries ORDER BY created_at DESC LIMIT 5;"
```

---

## Sign-off

- [ ] All Layer 1 automated green
- [ ] All Layer 2 manual steps checked per role (take screenshots of each dashboard)
- [ ] Layer 3 security probes all blocked as expected
- [ ] No `TODO` / placeholder shipped (Definition of Done)

> Frontend homepage (`/`) is owned by the separate `design-worker` session — do not sign off on it from this checklist. Coordinate with `opencode-task.txt` PHASE 3 gates (1440/768/375 diffs, Lighthouse a11y≥95, impeccable 0 findings).
