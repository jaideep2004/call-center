# Coverage Calls — Client Testing Guide (v2, Sept 2026)

> Test everything new in plain words. You need three logins in **separate browsers/incognito windows**: **Admin**, **Agent**, **Publisher**.
>
> **Before you start (one time):** deploy latest (`git pull`, `npm run migrate`, rebuild + restart all pm2 processes). Run `npm run check:migrations` — all must be recorded.

---

## 0. Prep — Stripe mode + SMTP

1. Admin → System Settings → Stripe card. Select **Test** mode, paste test keys + test webhook secret, **Save & Use Test**. Badge must read "Test mode — verified" (green only after a real API ping).
2. Localhost webhook secret (no Stripe CLI login needed for app testing): `stripe login` once, then `stripe listen --forward-to localhost:30001/api/webhooks/stripe` — paste the printed `whsec_…` as the Test webhook secret.
3. Confirm SMTP is configured (ask dev) — otherwise all "email sent" steps below only log warnings.

---

## 1. Live call connection (the most important flow)

**Setup:** campaign has a tracking DID + is active; agent approved, device tested, live for the campaign, funded (Section 2); agent clicks **Go Online** on Take Calls.

1. As the agent, open Take Calls **with the browser console open** (F12). Keep auto-pickup ON.
2. From your real phone, call the campaign DID.
3. **Expect:** popup rings → auto-answers → **Answering… → Bridging…** → connected in **under ~2 seconds**. Console must show `leg … state=ringing → phase=ringing`, `answer START`, `answer COMMAND OK`.
4. In pm2 logs: `bridge succeeded` on attempt 1–2, accept total well under 2s. (Older builds needed 3+ attempts — that delay is fixed.)
5. Hang up → call appears in Calls with recording (~1 min later, needs Recording ON in Telnyx).
6. **Missed path:** go offline mid-ring (or reject) → caller leg ends, call marked **missed**, agent gets `call:ended`, no phantom ringing.

## 2. Going online needs BOTH subscription AND top-up

1. Agent with **only a subscription** ($0 wallet) → Go Online blocked: *"Buy a subscription…" / "Top up your wallet…"*. Take Calls shows a red **Funding** checklist row saying exactly which leg is missing.
2. Agent with **only a top-up** (no plan) → blocked the same way.
3. Buy the missing leg → Funding row turns green → Go Online works.
4. **Postpaid agencies exempt:** Admin → agency → enable postpaid bypass → its agents go online with $0 and no plan.

## 3. Device gate (no untested browser online)

1. Fresh browser (no mic test done) → header **Go Online** refuses: *"Test your mic & speaker on Take Calls first"* and redirects there.
2. An agent left online from another device/session with no device check here is auto-set **offline** with a warning toast.
3. Take Calls Go Online button stays disabled until mic + speaker both verify.

## 4. Wallet top-ups ($1 / $250 / $500 / $1000)

1. Agent → My Wallet → pick **$1** (test) → Pay → Stripe test card `4242 4242 4242 4242` → success page says **"Payment credited"** and balance updates (it verifies with Stripe directly — no waiting on webhooks).
2. Check **Transaction History**: top_up entry for the **net** amount (fee never minted).
3. **Both inboxes + emails:** agent gets a receipt, agency head gets a copy.
4. Admin → FINANCE → **Payments**: row appears as **LIVE** (or TEST pill in test mode), totals update, Stripe link opens the payment. Pending rows have **Verify**; paste any `cs_…` id into **Recover a missing payment** to force-verify.
5. Payments page defaults to **Live** — test money never mixes into revenue.

## 5. Subscriptions (paid but must show active)

1. Agent → Subscriptions → paid plan → Subscribe → pay → you land back to an honest banner: **Verifying… → Active**, and the plan card appears with calls-used counter. (Old builds celebrated on URL alone — that lie is gone; "pending, refresh shortly" shows if Stripe is slow.)
2. Receipt email to agent + copy to head.
3. Free ($0) plans still subscribe instantly, no checkout.
4. API abuse check (dev): POST a paid plan id directly to `/api/v1/agent-subscriptions` → must **402**, never a free active plan.

## 6. Support tickets + mail

1. Agent → Support → raise a ticket → requester gets confirmation (inbox + email), agency **head** gets an alert with priority.
2. Admin → Support → reply → requester gets the reply mail. Bell badge updates live on all dashboards.
3. Notifications page: **no raw Payload column** anymore — human Message column; bell dropdown + View all work per role (agent/publisher see only theirs + global; admin sees all).

## 7. Privacy between agents (must all pass)

Log in as **two different agents** (A and B) and confirm:
- A opens Calls, Wallet → Transaction History, Recordings, Earnings, Subscriptions, Take Calls → **only A's rows** (try pasting B's call id into the URL → 404).
- B sees only B's. Heads/admins still see the team (that's intended).
- Calls **Export CSV + XLSX** downloads real files (the 500 error is fixed), and A's export contains only A's calls. Exports cap at 5000 rows.

## 8. Content: CMS, Blog, Campaign Updates

1. Admin → CMS → **Sections** tab (segmented control with counts): FAQ / Testimonials / Privacy / Terms only — **no Blog Posts** (blog lives in its own Blog tab now).
2. **Campaign Ads** tab: add an image/video creative (Drive links work) with CTA → agent home shows hero carousel + feed with **Preview / Download / Open in Drive** buttons.
3. Agent → **Campaign Updates** (nav, below Book Call): full grid of updates. **Onboarding** is now Book Call only.

## 9. Onboarding booking + booked state

1. Agent → Book Call → pick a slot in the calendar → after booking, tap **"I've booked my call"** → ✓ BOOKED banner (persists; "Book again" resets).
2. Tip: set the GHL calendar's thank-you redirect to `/dashboard/onboarding?booked=1` and it marks automatically.
3. Admin **Calendar nav entry is gone** (it never received GHL bookings) — old links redirect to the admin console.

## 10. Ledger (admin) + transfers

1. FINANCE → Ledger: **Current Balance / Money In / Money Out / Net** strip, IN/OUT badges, Agent column (agent short-id or "Agency"), direction + type filters that paginate honestly, full timestamps.
2. Agent Performance → **Transfer →** opens a **popup** (not an inline form). Send → agent wallet updates instantly, ledger refreshes. Transfers are **internal ledger moves, never Stripe charges**.

## 11. Settings (single agency card)

1. Agent → Settings → Agency tab shows **only** "Start a New Agency" (+ current-agency chip). No more Agency Profile editing (heads: profile edits are admin-side now).
2. Test leave-and-create: needs System Settings → Agency Creation **On** → tick the leave checkbox → Leave & Create → you become head of the new agency; old agency keeps your history.
3. Phone Numbers tab visible to **heads only**; plain agents get a "Heads only" notice on the page.

## 12. Publisher portal walkthrough

1. Admin → Publishers → invite → publisher registers → assign them a campaign (Campaign → Publishers tab). Note their **AFID**.
2. Publisher logs in → Dashboard lists the assigned campaign (zeros at first) → **Tracking Links** card → **Copy** → open the link on your phone → branded call page with tap-to-call number → visit bumps the **Clicks** count.
3. Make a real test call to the campaign DID with a funded agent online → agent dispositions it qualified → Publisher **Calls** shows the row (+ recording) and **Payouts** shows earnings.
4. Publisher A never sees publisher B's campaigns, calls, or payouts.

## 13. Payments admin + reconcile drill (do once)

1. Admin → Payments → pick any pending row → **Verify** → flips to completed + wallet credited.
2. If a customer ever reports "charged but no credit": paste their `cs_…` session id into **Recover a missing payment** → credited on the spot. Then check Stripe → Developers → Webhooks delivery log to fix the root cause (usually endpoint/secret).

---

**Done when:** every section above shows its green/expected state on live. Anything red — screenshot it with the pm2 log lines and browser console, and it gets fixed the same way as everything above.
