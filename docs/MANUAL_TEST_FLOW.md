# Manual Test Flow — Production Testing (local server)

One terminal is enough: `npm run dev` starts all three (Next.js app + realtime gateway + call-worker). Confirm all three ready lines in the output before testing. Do phases in order — each unlocks the next. Report reds as `phase/tab — did X, expected Y, got Z`.

## Phase 0. Start the machines (5 min)

Run `npm run dev` and confirm: `realtime-gateway ready` (live popups), `call-worker ready` (recordings, billing, syncs), `Next.js on port: 30001`. If the worker failed, routing still works but recordings never save — fix DB/Redis, don't open a second terminal (double workers double-process jobs).

Checklist: `.env` has Telnyx keys, Retreaver keys, `ENCRYPTION_KEY`, Stripe keys, `APP_BASE_URL` = ngrok URL (never localhost — Telnyx/Retreaver can't reach it). Migrations 51/51. Restart dev after any `.env` edit (stale modules serve old code).

## Phase 1. People first (10 min)

- **Agencies** → New: name `Acme Test`, slug `acme-test` → code `AC-…` appears.
- **Agents** → two agents:
  - `arjun@test.com` → Approve → States `[TX]` → endpoint `webrtc` → NPN `12345` → code `AG-…`.
  - `mei@test.com` → leave **unapproved** (your "should never ring" test).
- **Leads** → New lead → assign to Arjun → Notifications inbox gets `lead.assigned`. Edit only the status → no new notification (fires on assignment change only).

## Phase 2. Campaigns (30 min)

Five tabs per campaign. Plain meanings: **General** = identity + base price (what the buyer pays us) + min-connect seconds (shorter calls bill $0) + draft/active. **Publishers** = who may send traffic (tick + Save). **Bidding** = max payout (what we pay the publisher — must stay below Price) + visibility (Default = open pool, Exclusive = assigned only); leave `$ / call` override empty. **RTB & Numbers** = Retreaver link: Deploy creates the campaign there, paste the **real Retreaver-issued key** (Retreaver UI → campaign → Postback Keys → Add Key → Real Time Bidding, TTL 15, timeout 5, publisher left blank; Auto Create is demo-only), attach intake numbers. **Assignments** = exclusives only.

Type dollars, not cents:

| Campaign | Price | Min connect | Max payout | Visibility | Status |
|---|---|---|---|---|---|
| Medicare Short 30s | 16.00 | 30 | 10.00 | Default | active |
| Medicare Long 120s | 35.00 | 120 | 20.00 | Default | active |
| FE Short 30s | 50.00 | 30 | 35.00 | Default | active |
| FE Long 90s | 70.00 | 90 | 50.00 | Default | active |
| Medicare Excl $27 90s | 27.00 | 90 | 20.00 | Exclusive | draft → active after assignment |
| Medicare Excl $15 30s | 15.00 | 30 | 10.00 | Exclusive | draft → active after assignment |
| Medicare Excl $32 180s | 32.00 | 180 | 24.00 | Exclusive | draft → active after assignment |
| Medicare Excl $28 120s | 28.00 | 120 | 20.00 | Exclusive | draft → active after assignment |
| FE Excl $65 90s | 65.00 | 90 | 50.00 | Exclusive | draft → active after assignment |

Rule: Price − Payout = our earning ($16 − $10 = $6). Payout ≥ price gets blocked automatically. Per campaign also: Publishers tab → tick TestPub → Save; RTB tab → real key → Deploy → `Linked · cid`; exclusives → Assignments → tick agency + Arjun → Save → activate.

## Phase 3. Publishers, scripts, tutorials, plans (15 min)

- **Publishers** → New: `TestPub`, email, afid `TEST01`, fixed `10.00` → **Provision** (creates the Retreaver affiliate; never use Retreaver's affiliate screen except for pre-existing affiliates, then paste their afid) → `active` → invite link → register in incognito. Code `PB-…` shows. (Commission field hidden — payout = campaign max.)
- **Scripts** → New: `Hello [Your Name] from [State], my NPN is {{npn}}` → live-call overlay renders `Hello Arjun from TX, my NPN is 12345`.
- **Tutorials** (admin sidebar → OPERATIONS) → New with video URL + thumbnail + order 1 + Published + Required; second one left draft.
- **Plans** → New Plan (popup): `Starter` prepaid $0/100 calls; `Pro` postpaid $50/500.
- **Verticals** (Skills): tag agents `medicare` / `final_expense`, set as required skills on those campaigns — mismatched agents get `skill_missing` and never ring. Agents with no skills pass everything.

## Phase 4. Money (10 min)

Agency head → Billing → Pool Wallet → top up $5000 (test card `4242…`) → allocate Arjun $2000 / second $1500 / third $1000 → Remaining $500. Over-allocate → **422** (no invented money). Agent wallet shows personal + allocated + effective.

## Phase 5. Calls without spending (20 min, India-friendly)

Agent browser = free WebRTC phone. Fake the caller as admin: `POST /api/v1/routing/simulate {"campaign_id":"<medicare-short>","from":"+12145551234"}`.

1. `+1214…` (TX) → rings. 2. `+1305…` (FL) on TX-only → `state_mismatch`. 3. `+919876543210` on unrestricted → rings (null state passes); on TX-only → rejected (correct — Indian numbers carry no US state). 4. Talk 35s → revenue $16 / cost $10 / margin $6. 5. Hang up at 10s → $0 + `below_min_connected`.
6. **Suspension:** Arjun online → admin Suspend → his Go Online dies instantly (same write) → next call misses him → Re-approve → he re-enables manually.

## Phase 6. Real audio from India (1 ISD call, ~5 min)

Arjun live on Medicare Short (laptop mic/speakers). Dial the campaign's Telnyx DID from your mobile, talk 40s (past 30s minimum), hang up from mobile. Verify: two-way audio; Calls row `CL-…` ~40s; invoice $16 / payout $10; recording ▶ appears (~1 min, needs Telnyx Connection **Recording ON** + worker running — no URL to paste anywhere). No ring? `WEBHOOK_DEBUG=1`: no log = webhook URL wrong; log but no ring = agent not live/approved/funded. Optional PSTN leg: agent endpoint `pstn` + forwarding `+91…` (needs Telnyx international outbound + balance).

## Phase 7. Portal, CMS, marketplace, revenue (15 min)

- **Publisher** (incognito): empty pre-sync is correct (portal is synced-calls-driven) → after traffic + sync: per-campaign rows, call rows with playback, Payouts ledger (qualified = finished + payout > 0). Settings email update works.
- **Agent** (Arjun): Tutorials required badge → watch → resume → 90% completed ✓, draft hidden; buy Starter (test card); open ticket → admin reply lands as `support.reply` in his inbox.
- **Admin CMS** → Campaign Ads → Add creative popup → 3 hero (priorities 10/5/1) + 1 feed + 1 expired (hidden on agent dashboard; hero carousel shows 3).
- **Reserve curls:** TX + max 1800 → A/B eligible, C `payout_above_max`; $1 max → `no-target`, Retreaver untouched; same `idempotency_key` → `deduped: true`; exclusives never leak.
- **Revenue:** $0 until an invoice is marked **paid** (counts collected money only).
- **Notifications:** reply/assign events arrive live; Mark read / Mark all read.

## Environment notes

- Emails: Gmail SMTP forces From to the Gmail account (branded name kept); set `EMAIL_FROM` + `EMAIL_REPLY_TO` on your domain; production = domain SMTP (SendGrid/SES + SPF/DKIM).
- Supabase free is a dev sandbox (pauses when idle, quota-capped — you're already over). Production = client-owned Pro project, fresh migrate + seed + re-bootstrap; keep `ENCRYPTION_KEY` across moves.
- Serial IDs (`AC/CA/CL/PB/IN/AG-NNNN`) are display codes; UUIDs stay the keys. Unassigned phone numbers (spare pool) can never route.
