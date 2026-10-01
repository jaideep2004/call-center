# Client Tutorial Video — Recording Script (Coverage Calls)

Read this top to bottom while screen-recording. Each scene: **SHOW** (where to click), **SAY** (narration), **CHECK** (proof it worked). Total ~35 minutes; record in one take per part.

---

## PART 1 — Telnyx numbers: the rule that ends all confusion (5 min)

**SHOW:** Telnyx portal → Programmable Voice → your "Coverage Calls" application → Numbers tab.

**SAY:**
> "One rule for numbers: every phone number lives in exactly one place in Telnyx — the Voice API application called Coverage Calls. Never the SIP connection. The SIP connection is only the agents' browser audio — it holds no numbers and needs no webhook.
>
> So whenever you buy a new number in Telnyx for a new campaign: buy it under Phone Numbers, then attach it to the Coverage Calls Voice application. The webhook and channel limits already live there — 30 in, 30 out — you set those once, never per number.
>
> Then come to our app: Settings → Phone Numbers → Add. Type the number, pick the campaign, save. One number, one campaign. To reuse a number later, don't re-add it — use the per-row mover dropdown, or park it as spare. If you ever type an already-assigned number, the app now tells you exactly which campaign holds it."

**CHECK:** Add flow shows the one-number-one-campaign hint; mover dropdown lists campaigns.

---

## PART 2 — Admin: agencies & people (6 min)

**SHOW:** Admin → Agencies → New Agency. Type name, add 2 teammate emails in Invite box, create.

**SAY:**
> "Creating an agency now invites the team in the same step — no more hunting across three pages. Teammates get an email, register through the link, and land directly in your agency."

**SHOW:** Users page — All users table (every role), Memberships table (role dropdown, Suspend/Activate), Delete with its safety rails.

**SAY:**
> "All users are logins; Memberships are team links. Publishers have no membership — that's normal, they link through their publisher record. Delete is permanent and blocked for your own account, the last admin, and anyone with call or money history — suspend those instead."

**SHOW:** Agents → Pending tab → open → Approve.

**SAY:**
> "Approving places team-less agents straight into our home agency — Coverage Calls Public Leads — automatically. Funded, subscribable, callable, zero extra steps. Creating your own agency is purely optional, for team-builders only."

**SHOW:** Agency detail page → new Members list at the bottom (everyone inside, with roles/statuses).

**CHECK:** Approve a test agent → Users shows their agency immediately.

## PART 3 — Admin: campaigns, publishers, calls (7 min)

**SHOW:** Campaigns → New (2 steps) → detail tabs. Note the **Sync Retreaver** button (manual pull; auto-syncs every 10 min anyway). Emphasize Assignments tab: leave it empty = open to every eligible agent platform-wide; mention names = only those. Show the candidate logic using a live call's routing info.

**SAY:**
> "If calls ever miss with no popup anywhere, open the call and read its routing info — it names the exact gate: busy, wallet, states, assignment. And never assign a campaign to one person who's offline."

**SHOW:** Publishers → add → Provision (afid appears) → Invite → RTB & Numbers tab → assign a Retreaver number to their afid.

**SAY:**
> "Provisioning creates their Retreaver identity. The number-to-afid step is what makes their Retreaver popup show a tracking number — skip it and they only get ping details."

**SHOW:** Calls list (caller numbers now appear after buffer), call detail (recording, notes that survive hangup, Add note on ended calls).

## PART 4 — Agent journey, first click to first call (8 min)

As a fresh test agent, live:
1. Register (note the new phone field + captcha) → verify → dashboard (profile auto-created).
2. Settings → **My Skills**: pick your verticals on first login so matching campaigns can route to you.
3. Subscriptions: plans visible immediately (shared catalog); free Subscribe works with no team; paid unlocks after joining an agency (message says so).
3. Wallet top-up by card; Pool Wallet for heads (top up → allocate → effective balances).
4. Leads → Unassigned pool → **Claim** → work it.
5. Take Calls: checklist → live-campaign toggle → headset → Go Online → incoming tab **flashes + rings** → answer → disposition → notes persist after hangup.
6. If approved with no team: show auto-placement into the home agency (no agency creation needed). If they want a team: Settings → Create Agency **with invites**.

**CHECK:** full loop ends with earnings + a revealed caller number on the call.

## PART 5 — Publisher portal (5 min)

Accept invite → Overview → Tracking Links vs **Retreaver button** popup (number + ping block: endpoint, publisher ID, masked key) → Calls → Payouts tabs → Settings email. Demo with the Medicare campaign.

## PART 6 — Money, rescue & deploy hygiene (4 min)

Payments (live-only Collected, Test tab, Recover with `cs_...`), Ledger transfers, Fees → invoices, refund auto-reversal note, failed invoices stay failed (top-up first). Close with the deploy order: pull → **migrate** → build → restart → `/api/v1/health` (no pending, note build sha) → one test call.

---

## Recording tips

- Use a fresh test agent + test publisher; never touch real wallets on camera (use $1 test top-ups).
- Zoom to 125% so dropdowns read clearly.
- When a toast appears, pause 2 seconds so viewers can read it.
