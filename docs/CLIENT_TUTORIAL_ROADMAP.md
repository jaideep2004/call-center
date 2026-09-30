# Client Tutorial Roadmap — Coverage Calls

How to walk the client through **everything**, including all recent edits. Run the sessions in order; each lists what to show, what to click, and the "it worked" check. Companion: `CLIENT_HANDOVER_GUIDE.md` (feature reference).

**Before session 1:** pick the Platform home agency (Admin → System Settings → Platform home agency) so approvals auto-place solo agents. Have one test agent login + one test publisher login ready.

---

## Session 1 — Admin: people & agencies (30 min)

1. **Users page:** All users table (every role), search + role filter. Show **Create profile** on an agent-role user with no profile → they appear under Agents. Show role change + Suspend/Activate in Memberships. Stress: **Delete is permanent** (blocked for own account, last admin, history owners).
2. **Agents page:** Pending tab → open → **Approve** (auto-joins platform agency now). Show Approve/Decline/Suspend + new **Delete** (hides orphans like deleted-user leftovers).
3. **Agencies:** New agency **with teammate emails** (invites go out on creation) → detail (status, retention, postpaid flag) → invite box.
4. **Check:** new agent registers → Pending → Approve → Users shows agency → agent sees Command home.

## Session 2 — Admin: campaigns, numbers & publishers (30 min)

1. **Campaigns:** 2-step create (name → routing → price/min-connect/buffer → publishers) → detail tabs tour (General, Publishers, Bidding, RTB & Numbers, Assignments). Demo the **assignment lockout lesson**: assigning one suspended agent silences the campaign — show where to check.
2. **The number system (client's confusion — teach explicitly):**
   - Rule: **one number lives on one campaign at a time.** The number is the campaign's inbound door + caller ID.
   - Phone Numbers list shows every number **with its current campaign**; the mover dropdown reassigns (or parks as spare).
   - Adding an already-assigned number now answers *"already on campaign X — move it"* (or claims spare numbers in place). No more mystery 500s.
   - Campaign detail → RTB & Numbers tab mirrors Retreaver numbers (number/afid/sid).
3. **Publishers:** add → Provision (afid appears) → Invite → assign a Retreaver number to their afid → portal shows it. Sync campaigns/calls buttons; archived-on-Retreaver-delete behavior.
4. **Check:** test call through the campaign number routes to an online agent.

## Session 3 — Agent journey end-to-end (30 min)

1. Register → verify → dashboard auto-creates profile → admin approves (auto-joins platform agency).
2. **Subscriptions:** plans list (shared catalog), free Subscribe works with no team; paid needs an agency (message says so).
3. **Wallet:** top up by card (fee math), transaction history.
4. **Take Calls:** readiness checklist → live-campaign toggles → headset test → Go Online → take a call → disposition → notes.
5. **Leads:** **Unassigned pool** filter → **Claim** a lead (first click wins) → work it on lead detail.
6. **Check:** full loop register → approve → subscribe → top-up → online → call → earnings.

## Session 4 — Publisher portal (20 min)

1. Accept portal invite (role switches on same account) → Overview tour.
2. **Tracking Links** (our `/t/` links) vs **Retreaver button**: tracking number + ping-post block (endpoint, publisher ID, masked key). What each value is for + keep-key-private warning.
3. Calls (Play recordings) → Payouts (Monthly vs Qualified tabs, Export CSV) → Settings (email).
4. **Check:** ping-post example or tracking-link test call appears with payout after qualification.

## Session 5 — Money & safety (20 min)

1. **Payments:** Collected = live only (Test tab never moves it); Recover-a-payment with `cs_...`; Verify per pending row.
2. **Ledger:** top-up panel, In/Out tabs, Transfer → to agents (serialized, no double-send).
3. **Fees/Invoices/Revenue/Reports:** generate monthly → charge/waive → Monday invoices → revenue trend.
4. **Refunds:** Stripe refund/dispute auto-reverses wallet/pool, cancels the sub, marks payment refunded; shortfalls warn loudly.
5. **Pool Wallet:** top up → allocate per agent (cap enforced even under double-click) → effective balances.
6. **Check:** test-mode top-up → Test tab only; refund it → ledger reversal appears.

## Session 6 — Content, support & deploy hygiene (15 min)

1. **CMS:** edit FAQ/testimonial/legal → Save & Publish → check live site.
2. **Support tickets:** agent creates → admin Start/Resolve/Close + replies.
3. **Skills/Plans/Tutorials/Scripts:** add one of each; feature-request voting.
4. **Deploy order (critical):** pull → `npm run migrate` → build → restart → check `/api/v1/health` (no `migrations_pending`, note `build.sha`) → one test call.

---

## Backward compatibility notes (all recent edits)

- Everything shipped is **additive or widening**: lists that showed more now hide archived/dead rows by default (explicit filters still reach them); guards that 403d now permit more (plans catalog, free subscribe, claim); new endpoints/routes are new.
- **Needs `npm run migrate`:** 0066 (publisher email unique — verified no live dupes, safe), 0067 (delete cascades, NOT VALID — safe), 0068 (caller escrow column), 0069 (refund reversals table), 0070 (RLS gaps). All idempotent; safe to run together.
- **Behavior changes to call out:** archived campaigns hidden by default (still under Archived filter); Retreaver-deleted campaigns auto-archive on sync; subscription/plan scope is now platform-wide; caller numbers reveal post-buffer to entitled viewers.
