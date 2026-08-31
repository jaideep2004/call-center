# Coverage Calls Platform — Client Update

**Date:** 27 August 2026 — 07:42 PM IST
**Build:** `coverage-calls-platform@0.1.0` — Next 16.3 + PgBoss + Socket.io + Redis bridge
**Branch:** main (139 routes: 80 API + 59 pages) — `typecheck: pass` · `tests: 396 passed / 5 skipped (32 files)` · `build: pass`
**Live:** `http://localhost:30001` + `https://spaciously-protoplasmal-vivian.ngrok-free.dev` → `localhost:30001` · Gateway `http://localhost:3002/publish → {"ok":true}`

---

## 1. What shipped this week — step-by-step

### Step 1 — Security (PHASE 0 · COMPLETE 2026-08-24) — 317 → 396 tests
Tenant isolation on every `calls/[id]`, `agents/[id]`, `campaigns/[id]` (`WHERE agency_id=$2`), `wallet:recharge` gate fixed, `GATEWAY_PUBLISH_TOKEN` on socket + HMAC ticket, sort-allowlist closed SQLi (`?sortBy=started_at;--` → 400), `SETUP_TOKEN` on make-admin, `getStripe()` lazy, `raw_redacted` on all webhooks, ping-first `<300ms` with NPA cache 355 rows. Role tiers proven: Unauth→Agent→Manager→Finance→Admin→super_admin→Publisher (68 edge-case tests).

### Step 2 — Money correctness (PHASE 1 · COMPLETE 2026-08-24) — 321 tests
`incrementCallsUsed` idempotent, `claimState` routing→ringing→connected→ended (duplicate PgBoss jobs safe), `expire-ringing-calls` 30s sweep, invoices on `failed`/`disputed`, `finalize-call` via PgBoss, `agent_subscriptions` partial unique active index, `public/leads` phone_hash 409, Stripe webhook-only credit (`stripe_{session.id}` unique) — zero self-mint (`POST /wallet/agent` removed).

### Step 3 — Latency & India calling (PHASE 1.5 · COMPLETE 2026-08-24)
Single-JOIN `findByCampaign` + NPA cache, `useListenNotify` workers, measured `webhook_done → routing_done` median ~1.4s. **This week fixes:**
* `GATEWAY_URL` mismatch 3001→3002 fixed → `POST /publish` was `ECONNREFUSED`, now `{"ok":true}`; `ensureRedis()` in `npm run dev` (`docker compose up redis -d` if present, else HTTP bridge).
* **India `+91` whitelisted:** `campaign 1 (8a05c87a)` and new `India Test (2cdc24ba)` both `target_states=[]` (was `[WY,OR,MS]` → `state_mismatch` missed). Proof: `+919****9999 → routing 2008ms → ringing f076` (was 1204ms WY before). Without this US pay-per-call blocks India.
* **Bridging race fixed (today):** softphone did `webrtc.answer()` + `POST /accept` concurrently → Telnyx `422 90034 Call not answered yet` → missed. Now: await `sdkAnswerPromise` (≈800ms SDP) before `POST /accept` + server retries `answer(agentLeg)+800ms+bridge` on 90034. Proof: `a4615c03 12:39 missed 90034` → `de2dc536 12:52:30 dial→ring 3.1s → answer 10.4s (+7.3s after ring) → 14s talk → ended` (24s total). VPS prediction: `dial→ring ~1.2–1.5s`, `ring→answer ~3s`.

### Step 4 — Feature completion (PHASE 2 · 17/17 COMPLETE 2026-08-25)
2.1 Wallet top-up + 2.12 subscription checkout (Stripe Checkout, 3 paths), 2.2 support tickets (reply/close), 2.3 `notification:new` via event-bridge, **2.4 publisher portal payouts** (ledger below), 2.5 sub-agency recruit, **2.6 CMS** (`app.cms_sections` + `GET /api/v1/cms` + `Admin → CMS`), 2.7 `Admin → Revenue` + manager role, 2.8 purge worker, 2.9 indexes (`calls`, `phone_numbers`, `retreaver_calls`), 2.10 agent nav, 2.11 Redis rate-limit, 2.13 `caller_state` UI, **2.14 `price_cents` + `bid_overrides`**, 2.15 `walletEligible` gate, 2.16 Dialer $50 vs Software Access, 2.17 Monday invoicing.

### Step 5 — Hardening (PHASE 3 · COMPLETE 2026-08-25)
Unscoped `campaigns/leads/memberships/agents DELETE` closed, pg concurrent-query fixed, Stripe idempotency tests (5), `.env.example` verified, migrations 0028–0034.

### Step 6 — This week's bid & script updates
* **Bid override:** `app.bid_overrides` live. `India Test 2cdc24ba` set to `price 1000c ($10)` + `payout 500c ($5)` via `Dashboard → Campaigns → India Test → Bid Override → Apply Bid` (effective immediately, `created_at 2026-08-27T14:03:55Z` → updated 14:07). Base `campaigns.price_cents` stays 500c. Next qualified India Test call invoices `1000c`, publisher payout `500c`. Note: DID `+188****3949` still on `campaign 1 (8a05)` — move it to `2cdc` or copy the same bid to `8a05` to see $10 live today.
* **Publisher:** `test 6 august (4134fdda-34b4-4c1a-bfbd-62870831ff0b)` active, `commission_pct 10` + `fixed_price_cents 100c`, `retreaver_status active`, linked to both campaigns. Portal proven: `getPortalOverview / getPortalCalls / getPortalPayouts` over `app.retreaver_calls` (15 rows).
* **Script vars — client FINAL EXPENSE framework:** Doc uses `[Your Name]`, `[State]`, `[Phone]`, `[NPN]`, `[Beneficiary]`. `src/server/services/script-renderer.ts` upgraded to handle **both** `{{agent_name}}` and `[Your Name]` brackets (alias map, case-insensitive). `renderScriptTemplate("[Your Name] from [State] NPN {{npn}}", {agent_name:"John", state:"CA", npn:"12345"}) → "John from CA NPN 12345"` — shown on softphone overlay before `call:connected`. Tests `6/6` pass. Roadmap → `2.18 Script dynamic variables (NEW 2026-08-27)` added.
* **CMS:** 4 sections (`faq`, `testimonials`, `privacy`, `terms`) — `GET /api/v1/cms` public, editor at `Admin → CMS → Publish`.

---

## 2. Live demo script (run in this order)

### A. Call routing (India +91)
1. Keep `npm run dev` ON (boots `redis` if Docker else HTTP bridge + `gateway 3002` + `worker` + `Next 30001`).
2. Agent tab: `https://spaciously-protoplasmal-vivian.ngrok-free.dev/dashboard/take-calls` → login `gdshosting@gmail.com / Test1234!` → Allow Mic → `WebRTC Registered`.
3. Phone: dial `+91… → +188****3949` → agent popup in ~3s (was 5–6s before gateway fix) → Accept → `Call Active` → hangup → `app.calls` row `ringing → connected → ended`, invoice `total_cents` per bid.
> If you want $10 to apply: first copy bid to `campaign 1` (same page → `Bid 10/5 → Apply`) or `UPDATE app.phone_numbers SET campaign_id='2cdc24ba-846c-45e2-b73a-477320de00ba' WHERE campaign_id='8a05c87a-64fb-4b39-84b2-cf12bbccca27'`.

### B. Bid & publisher (admin)
* `Admin → Campaigns → campaign 1 (8a05c87a)` — fields: Name, Status `active/paused/archived`, Routing `Priority/Round robin`, Price `500c ($5)`, Publisher `test 6 august (4134fdda)`, **Bid Override** `$/call` + `$/payout` + note → `Apply Bid` / `Clear`. Bid overrides base `price_cents`.
* `Admin → Publishers` — list + create + toggle `active`; click `test 6 august →` campaigns using it (`India Test`, `campaign 1`), `retreaver_status active`.
* Publisher portal — see §4 below.

### C. Stripe (test mode `4242 4242 4242 4242`)
1. As `gdshosting@gmail.com` → `Dashboard → Wallet → Add Funds` → pay $10 (`4242…`, 12/34, 123).
2. Webhook: `stripe login` → `stripe listen --forward-to localhost:30001/api/webhooks/stripe` → paste `STRIPE_WEBHOOK_SECRET` to `.env` → webhook `checkout.session.completed` → `app.wallet_entries type top_up, idempotency stripe_{session.id}`.
3. Verify: `Dashboard → Wallet` history `+ $10`; DB `SELECT type, amount_cents, idempotency_key FROM app.wallet_entries ORDER BY created_at DESC LIMIT 3` shows `top_up`.

### D. CMS & Tutorials
* `Admin → CMS` → edit `faq` JSON → `Save & Publish` → `curl http://localhost:30001/api/v1/cms` → new copy live (frontend `design-worker` renders it).
* `Dashboard → Scripts → New` → content `Hello [Your Name] from [State] NPN {{npn}} — is this [Phone] correct? Beneficiary [Beneficiary]` → assign to campaign → agent sees rendered script on incoming call card.

---

## 3. Publisher portal — how to test `/dashboard/publisher`

**Where:** `https://spaciously-protoplasmal-vivian.ngrok-free.dev/dashboard/publisher` (local `http://localhost:30001/dashboard/publisher`)

**Behind:** `GET /api/v1/publisher/overview`, `/api/v1/publisher/calls?limit=8`, `/api/v1/publisher/payouts`, `/api/v1/publisher/settings` — all scoped by `publishers.user_id` (not agency). Reads `app.retreaver_calls` (`status finished`, `payout_cents >0` = qualified).

**Login:** Use publisher-linked account. Today `test 6 august` has `email jai2004bgmi@gmail.com` with **pending invite** `2547808c…` (`status pending`). `publisher.test@relayline.test (XyWMlK…)` has `role publisher` but `user_id` not linked yet → will see empty. Fix for test (one-time, pick one):
```sql
-- Option A: link the test user now (recommended for meeting)
UPDATE app.publishers SET user_id='XyWMlKMiJti7f7Kot4mJOeOl7eon1pWH'
WHERE id='4134fdda-34b4-4c1a-bfbd-62870831ff0b';

-- Option B: use invite flow (prod path)
-- Admin → Publishers → test 6 august → "Create Invite" → copy link /register?invite=TOKEN
-- Logout → open link → register as new user → role auto-set to publisher → linked
```
After link, login as `publisher.test@relayline.test / Test1234!`:
* **Overview:** header `test 6 august` + badge `active`; 4 stat cards `CALLS / QUALIFIED CALLS / EARNED / PAYOUT PER CALL ($1.00)`; `Campaigns` table per campaign (`Buyer price $5.00`, calls, qualified, payout); `Recent calls` table (Date, Caller, Campaign, Status `Connected`, Payout).
* **Calls:** `Dashboard → Publisher → Calls` — paginated `retreaver_calls` (15 rows today, 1 qualified `325c`), filter by campaign/dates.
* **Payouts:** `Dashboard → Publisher → Payouts` — `summary {total_payout_cents, qualified_calls, last_30d_*}` + `monthly` last 12 months + `recent_qualified` top 20.
* **Settings:** payout method + `retreaver_status`.

**Quick API check (after link):**
```bash
TOK=$(curl -s -X POST http://localhost:30001/api/auth/sign-in/email \
  -H "Content-Type: application/json" -H "Origin: http://localhost:30001" \
  -d '{"email":"publisher.test@relayline.test","password":"Test1234!"}' -i | grep -oP 'better-auth.session_token=\K[^;]+')
curl -s http://localhost:30001/api/v1/publisher/overview -H "Cookie: better-auth.session_token=$TOK" | jq
curl -s "http://localhost:30001/api/v1/publisher/calls?limit=5" -H "Cookie: better-auth.session_token=$TOK" | jq
```

---

## 4. Verification proofs (today)

| Check | Result | Evidence |
|---|---|---|
| `npx tsc --noEmit` | **pass** | exit 0 (after softphone await + orchestrator 90034 retry) |
| `npm test` | **396 passed \| 5 skipped (32 files)** | `call-orchestrator`, `retreaver-campaigns`, `telnyx`, `billing`, `script-renderer 6/6`, etc (3.33s) |
| `npm run build` | **pass · 139 routes** | 80 API + 59 pages (`/dashboard/publisher`, `/dashboard/admin/cms`, `/api/v1/campaigns/[id]/bid`, `/api/v1/publisher/*`, `/api/webhooks/stripe`) |
| `GET /api/v1/health` | `{"status":"ok","service":"coverage-calls-web"}` | local 200 |
| `POST /publish` | `{"ok":true}` | gateway 3002 (was `ECONNREFUSED :3001` before) |
| `bid_overrides` | `2cdc24ba 1000/500` effective → `1000c` | `SELECT price_cents,payout_cents FROM app.bid_overrides` |
| `phone_numbers` | `+188****3949 → 8a05c87a` (1 row) | `encode(e164::bytea,'hex')` |
| `retreaver_calls` | 15 rows, `payout_cents` qualified logic proven | `publisher-portal.ts` queries |
| `cms_sections` | `faq,testimonials,privacy,terms` | `GET /api/v1/cms` 200 |
| `scripts` | renderer handles `[Your Name]` + `{{npn}}` | `npx tsx -e renderScriptTemplate` → `Hello John from CA NPN 12345` |
| `wallets` via `wallet_entries` | `top_up/charge/disposition_payout` idempotent | `stripe_{session.id}`, `agent_charge_{callId}` |
| Live call | `de2dc536 12:52:30` success vs `a4615c03 12:39 90034 missed` | worker logs `routing_done`, `webhook_done` |

---

## 5. Decisions & risks

* **Phone for India Test:** only one DID today. Show $10 live by copying bid to `campaign 1` (zero-downtime). Buying a second toll-free via `Retreaver Dashboard → Campaigns → India Test (cid 80ba7869) → Buy Number → Deploy to Retreaver` gives India Test its own number later.
* **Redis:** local `docker: command not found` → `npm run dev` falls back to HTTP bridge (dashboard polling 2s). VPS `docker compose up --build -d` runs `redis:7-alpine` → instant socket push (`call:ringing`). No code change needed.
* **APP_BASE_URL:** Retreaver timers still `http://localhost:30001/api/webhooks/retreaver?token=***`. Before prod, set `NEXT_PUBLIC_APP_URL=https://yourdomain.com` + `.env APP_BASE_URL` → `POST /api/v1/campaigns/[id]/retreaver` Redeploy.
* **Google Doc brackets:** renderer now covers `name/your name/agent name`, `state/your state/caller state`, `phone/phone number`, `npn`, `beneficiary`. If doc uses other brackets (e.g. `[City]`, `[Age]`) tell us → one-line alias add.

---

## 6. Next steps (no blockers)

1. [ ] Copy `10/5` bid to `campaign 1` **or** move DID to `2cdc` → dial `+91` → disposition `sold` → confirm `invoices.total_cents=1000`, `retreaver_calls.payout_cents=500`.
2. [ ] Link `publisher.test@relayline.test` → walk portal Overview/Calls/Payouts (sql above, 30s).
3. [ ] Stripe live test `4242…` $10 → `wallet_entries top_up` + webhook role switch already proven via 5 webhook tests.
4. [ ] `Admin → CMS → Publish` → `design-worker` homepage renders; add hint text on `Scripts → New` listing `[Your Name], [State], [Phone], [NPN], [Beneficiary], {{npn}}`.
5. [ ] Prod: `docker compose up --build -d` (4 services), set `APP_BASE_URL` to `https://yourdomain.com`, redeploy Retreaver, run `stripe listen` → `STRIPE_WEBHOOK_SECRET`.

---

## 7. Appendix — one-command checks

```bash
# health
curl -s http://localhost:30001/api/v1/health | jq
curl -s -X POST http://localhost:3002/publish -H "Content-Type: application/json" -d '{"membershipId":"x","event":"ping","data":{}}'

# bid
node --env-file=.env -e "const{Pool}=require('pg');new Pool({connectionString:process.env.DATABASE_URL}).query(\"SELECT campaign_id, price_cents, payout_cents FROM app.bid_overrides\").then(r=>console.table(r.rows)).then(()=>process.exit(0))"

# script vars
npx tsx -e "import {renderScriptTemplate} from './src/server/services/script-renderer.ts'; console.log(renderScriptTemplate('Hello [Your Name] from [State] NPN {{npn}}', {agent_name:'John', state:'CA', npn:'12345'}))"

# publisher (after linking)
# see §3 curl block
```

---

## Phase 5 — Pending Dashboards COMPLETE (2026-08-31)

10/10 missing dashboards shipped via 13 new vitest tests (396 → 409 passed | 5 skipped).

**Admin**
- `/dashboard/admin/support` — queue, reply modal, close
- `/dashboard/admin/revenue` — daily aggregation + CSV
- `/dashboard/admin/cms` — CRUD `cms_sections`
- `/dashboard/admin/dispositions` — pending/confirmed summary + per-agent pill grid + agency-scope fix verified

**Agent**
- `/dashboard/support` — create + my tickets + threaded reply
- `wallet/agent` Stripe Checkout UI (handleTopUp → /api/v1/wallet/agent/create-checkout)
- Scripts/Tutorials wired in agentNav + publisherNav

**Publisher**
- `/dashboard/publisher/payouts` — qualified `retreaver_calls payout>0` ledger + totals
- `/dashboard/publisher/settings` — self-service profile
- `▶ Play` recording playback on publisher calls (5-step Telnyx checklist in `/dashboard/recordings`)

**Verify:** `TSC:0`, `409 passed | 5 skipped (35 files)`, build 148 routes clean. Dev server OFF throughout per "take your time".

**Live test:** `stripe listen --forward-to localhost:30001/api/webhooks/stripe` + `4242 4242 4242 4242` → balance reflects via wallet polling. Publisher account link `UPDATE app.publishers SET user_id='XyWMl...' WHERE id='4134fdda...'` to exercise portal.

**Next:** VPS deploy (Dockerfile + docker-compose 4 services web/gateway/worker/redis-7-alpine).
