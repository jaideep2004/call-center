# Coverage Calls — Client Testing Guide

> How to test the whole app yourself, in plain words. You need three logins:
> **Admin** (platform owner), **Agent** (takes calls), **Publisher** (sends traffic).
> Open each in a separate browser (or normal + incognito windows) so sessions don't mix.

---

## Part 1 — Admin dashboard (`/dashboard/admin`)

Log in as admin. You land on the **Command** home: total calls, agents online, leads, revenue, live queue.

### 1. Agencies (PEOPLE → Agencies)
- You see every agency (name, code like `AC-0001`, status, created).
- Open an agency → edit name/retention → Save. Delete button soft-deletes it — the row must **disappear from the list after refresh** (deleted = hidden, never destroyed).
- "+ New Agency" is a just-in-case tool. Normal flow: **agents create their own agency** (Settings → Start a New Agency → Leave & Create).

### 2. Agents (PEOPLE → Agents)
- Approve a new agent (status → approved). They get an **approval email** automatically.
- Suspend an agent → they go offline instantly and routing skips them.
- Open an agent → wallet, subscriptions, states, skills.

### 3. Campaigns (OPERATIONS → Campaigns)
- Each campaign shows price (what the buyer pays us) and min-connect seconds (shorter calls bill $0).
- Open a campaign → **RTB & Numbers** tab → **Tracking numbers**: add your Telnyx DID here (`+1…`). This is the number callers dial to reach this campaign. Unassign parks it as spare (it can never route traffic while spare).
- **Publishers tab**: tick which publishers may send traffic to this campaign. **Bidding tab**: max payout (what we pay the publisher — keep it below price). **Assignments tab**: exclusives only.
- A campaign with no tracking number can never receive calls (fail-closed by design).

### 4. Publishers (OPERATIONS → Publishers)
- "+ New" → name + email → **Invite** sends them a branded email with a register link (always the live domain, never localhost).
- After they register, assign them campaigns (step 3) and watch their calls/payouts appear.

### 5. Calls, Disputes, Recordings
- **Calls**: every call with state, duration, agent, campaign. Short/disputed calls are marked, never silently billed.
- **Disputes**: confirm a disposition → payout + invoice rows are created.
- **Recordings**: play links appear ~1 min after the call (needs Recording ON in your Telnyx Connection).

### 6. Money (FINANCE → Plans, Fees, Revenue, Ledger)
- Top up any wallet with test card `4242…`: checkout shows `credit + 3% fee = charged`, wallet is credited the **net** amount only.
- **Fees**: postpaid agents get a monthly **Dialer Fee** (plan price); prepaid agents get **Software Access**. Every Monday the system rolls pending fees into **one invoice per agency and emails it automatically** — re-running never resends.
- **Revenue** counts only `paid` invoices (collected money, not promises).

### 7. System (SYSTEM → Calendar, Reports, Support, CMS, Notifications, Settings, System Settings)
- **Calendar**: entries only — agents book onboarding calls on their side (GoHighLevel widget); you just see what was booked.
- **System Settings → Stripe**: badge is green **only** after a live API ping succeeds (Test Connection). Saved-but-unverified keys show "not verified".
- **Notifications**: the bell (top-right, all dashboards) shows latest + unread count; click marks read.

---

## Part 2 — Agent dashboard (OPERATIONS CONSOLE)

Log in as an agent (use incognito).

### 1. Going online (the money rule)
- Header shows an **Online pill + logout** top-right, next to the bell.
- Click **Go Online**: it works only if your wallet is funded **or** you hold an active subscription. Otherwise you get a clear error toast telling you to top up. **Why: an unfunded online agent receives calls the publisher still bills us for — so the app refuses.**
- Keep **auto-pickup ON**: calls answer the instant they ring, even if you glance at the popup late.

### 2. Take Calls
- Incoming calls pop up with Accept/Reject. Minimize anytime — the bottom-right pill keeps glowing (**green** = connected, **amber** = ringing, **blue** = connecting) with timer + Hang Up.
- Layout: **Live Campaigns** (with search box) and **Call Readiness Checklist** sit side by side, equal width, on top; Device check + Agent Snapshot below.
- Browse Campaigns shows live campaigns with prices — **never publisher payouts** (hidden by design). **Exclusive campaigns appear only if assigned to you.**
- Accept returns instantly now — no more frozen "connecting" screen; a Cancel button is there while bridging. If the caller is already gone you'll get "no longer ringing" instead of a ghost accept.

### 3. Wallet, Book Call, Support
- **My Wallet**: personal balance + top-up (Stripe, 3% shown). **Book Call**: book your onboarding call (GoHighLevel) — new **Campaign Updates** tab beside it shows every campaign creative full-size (images + videos play inline).
- **Home layout**: Quick Actions now sits in the top row where Today's Goal was (Today's Goal moved to the side stack).
- **Support**: open tickets, replies arrive by inbox + email.

---

## Part 3 — Publisher dashboard (PUBLISHER PORTAL)

Log in as a publisher (third window).

- **Campaigns**: shows every campaign assigned to you, even with zero calls yet — price, your calls, qualified calls, payout.
- **Calls**: your traffic with status + payout per call. **Payouts**: totals + per-campaign history.
- You cannot see agents, other publishers, wallets, or admin pages (403 everywhere else).

---

## Part 4 — End-to-end call test (do this live)

1. Agent: funded wallet, online, auto-pickup ON, Take Calls open.
2. From your mobile, dial the campaign's Telnyx DID.
3. Within ~2–3 seconds the agent softphone rings and auto-answers. Talk 40 seconds, hang up from mobile.
4. Verify: Calls row ~40s → revenue/cost/margin on a $16 campaign ≈ $16/$10/$6; recording appears in ~1 min; disposition → payout.
5. Hang up at 10 seconds instead → **$0, `below_min_connected`** — short calls never bill.

---

## Part 5 — What we fixed (connect speed + publisher charges)

**Why calls connect fast (~2s inbound → ring):**
- Webhook answers the caller leg immediately (fire-and-forget) and returns in <500ms; routing runs async in the worker.
- Worker wakes the instant a job lands (Postgres NOTIFY, 0.5s poll fallback), 12 parallel route slots.
- Routing is 4 parallel indexed queries + one atomic claim — same speed for 10 or 500 agents; duplicates can never double-dial.
- After Accept, bridging retries up to ~8s for late pickup (previously died at 0.8s), then marks missed cleanly.

**Why the publisher can't overcharge you:**
- Nobody available → the publisher's ping is rejected up front (`no_agent_available`) — the call never arrives, nothing to bill.
- No answer / reject / sub-threshold duration → **$0 on our side, always** (no invoice line without real connected talk time).
- Unfunded agents can't go online, so dead rings don't happen.
- One honest limit: if *their* terms count sub-threshold calls as payable, that's a contract question — confirm with them that non-connected/short calls aren't billed.

**If something looks wrong**, report it as: `page — did X, expected Y, got Z` (plus the pm2 log line if it's a call).

---

## Part 6 — Latest changes to re-test (this round)

1. **Agency invite + postpaid**: Admin → Agencies → open an agency → **Invite agents** box (email → invite scoped to that agency) and **Postpaid agency** toggle. Flip postpaid ON → members of that agency go online with $0 wallet; toggle back → funding gate returns. Heads cannot set this (403 if attempted).
2. **Signup flow**: register a brand-new user directly (no invite) → lands with **no agency** (can create their own) → create agency → appears in Admin → Agents with correct status; Members tab loads (was stuck on skeletons before).
3. **Exclusives**: set a campaign to Exclusive → Bidding tab shows the amber **Exclusive access** panel with agency/agent dropdowns → assign one agency → only its agents see the campaign in Browse; everyone else doesn't.
4. **Tracking numbers per campaign**: campaign → RTB & Numbers → Tracking numbers → add DID → appears; Unassign → parked as spare. Google Drive share links pasted in CMS ads now render (auto-rewritten to direct links).
5. **Admin home Call Activity**: bars now show even when most calls missed (missed/failed used to be invisible, leaving the card empty). Numbers are real per-state counts, not estimates.
6. **Instant accept**: Accept returns immediately; Cancel available while bridging; accepting a dead call gives "no longer ringing".
7. **New pages**: `/blog` (archive + posts, CMS-managed), `/about` (new design), homepage FAQ section (CMS-managed) — linked in header/footer.
8. **Migrations/code health**: 62/62 applied, `typecheck` clean, full suite green.
