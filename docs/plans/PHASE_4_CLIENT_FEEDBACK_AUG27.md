# Phase 4 — Client Feedback 2026-08-27

**Goal:** Act on 7 client feedback points + 3 ops fixes from 27 Aug call. Primary product intent: **push agents to buy prepaid (wallet) plans** over postpaid.

**Prereq:** Phases 0–3 COMPLETE (2026-08-25) — 328 tests, 139 routes, typecheck clean. Do not regress.

**Source:** Client call 27 Aug (softphone controls, Vertical rename, prepaid/postpaid, notes, disputes, recordings, calendar booking) + wallet recharge report + agent display `f076 → CC1`.

**Execution:** 4.1 → 4.2 → 4.3 in order. Each item = one commit, typecheck + tests before next.

---

## 4.1 Quick wins — labels, plan type, wallet, agent code (SHIP FIRST)

### 4.1.1 `skills → Vertical` rename
- File: `src/app/dashboard/agents/new/page.tsx:75`, `src/app/dashboard/agents/[id]/page.tsx`, `src/app/dashboard/admin/skills/page.tsx` header, `useSkills` label.
- Keep DB `skills` column + API `skills` field for compat; add `vertical` alias in `validate.ts` and serializer (accept both).
- Accept: invite page shows `Vertical`, skills chips unchanged, old `skills` payload still works.

### 4.1.2 `agent_plans.billing_type` prepaid/postpaid dropdown
- Migration `0035`: `ALTER TABLE app.agent_plans ADD COLUMN billing_type text NOT NULL DEFAULT 'prepaid' CHECK (billing_type IN ('prepaid','postpaid'))`.
- `src/app/dashboard/admin/plans/page.tsx`: add `<select>` prepaid/postpaid (default prepaid) + send `billing_type`.
- API `POST/PUT /api/v1/agent-plans` validate enum; list shows badge `Prepaid ●` / `Postpaid`.
- `src/server/services/permission-data.ts`: checkout still `wallet:recharge`; routing already tiered (`routing.ts:10 tier 1 prepaid > tier 2`). Later 4.2 adds nudge badge `Recommended`.
- Accept: admin creates `Starter — Prepaid $29` + `Pro — Postpaid $49`; `SELECT billing_type FROM app.agent_plans` has both.

### 4.1.3 Wallet Stripe top-up — not reflecting
- Root: webhook needs `stripe listen --forward-to localhost:30001/api/webhooks/stripe` + `STRIPE_WEBHOOK_SECRET` match; without it `payments.status=pending` forever, `wallet_entries` never written.
- Fix: `src/app/api/webhooks/stripe/route.ts` already idempotent; add `src/app/dashboard/wallet/page.tsx` polling on `?success` + toast, and `/api/v1/wallet/balance` revalidation (no cache). Add `GET /api/v1/debug/payments` admin check for pending.
- Keep `POST /api/v1/wallet/agent` instant top-up for dev (no Stripe) — do not remove.
- Accept: test `4242 4242 4242 4242` → webhook `checkout.session.completed` → `wallet_entries type top_up, idempotency stripe_{session.id}` → wallet balance +$10 without manual refresh. Pending visible in admin.

### 4.1.4 Agent display `CC1` + name (not raw `f076...`)
- Migration `0036`: `ALTER TABLE app.agents ADD COLUMN display_code text UNIQUE; CREATE SEQUENCE agent_code_seq;`.
- On `agents.create`: `display_code = 'CC' || nextval('agent_code_seq')` per agency (or global if simpler); backfill: `UPDATE app.agents SET display_code = 'CC' || row_number() OVER (ORDER BY created_at) WHERE display_code IS NULL`.
- Replace `slice(0,8)` in: `softphone.tsx:348` (campaign + agent), `calls/[id]/page.tsx:198`, `calls/page.tsx`, `recordings/page.tsx`, `agents/[id]/page.tsx`, `dispositions` tables. Render `CC1 — {{user_name}}` (join `user`).
- Accept: call `f076210e-f602...` shows `CC1 — Jaideep Sidhu` everywhere; API returns `display_code` and `agent_name`.

---

## 4.2 Softphone & call workflow (agent-facing)

### 4.2.1 Softphone controls: mute, hold, dialer
- `src/components/softphone.tsx` + `src/lib/use-telnyx-webrtc.ts` (`@telnyx/webrtc` SDK).
- Mute: `track.enabled = !muted` (local mic), UI toggle, icon state.
- Hold: `POST /api/v1/calls/[id]/hold` → `provider.hold({callControlId})` / `unhold`; new `src/domain/providers/telnyx.ts:hold/unhold` via `client.calls.actions.hold`.
- Dialer/DTMF: keypad `0-9 * #` → `provider.sendDTMF({callControlId, digits})` → `POST /api/v1/calls/[id]/dtmf`.
- Show timers, hold badge, mute indicator on `connected` card.

### 4.2.2 Script auto-popup
- Current: left-bottom card `renderedScript` only when `script` exists. Change: on `call:ringing` auto-open as centered modal/dialog with rendered `script-renderer` vars (`[Your Name]`, `[State]`, `{{npn}}`), close on Accept or dismiss, keep mini card as fallback. Hint text on `scripts/new` already lists vars (2.18).

### 4.2.3 Notes in dialer popup
- `src/components/softphone.tsx` `connected` state: add `<textarea>` + `Save` → `POST /api/v1/calls/[id]/notes {body}` → new `app.call_notes (id, call_id, agent_id, body, created_at)` + RLS per agency. Also visible in `calls/[id]/page.tsx` timeline.
- Accept: agent types during call, notes persist after `ended`, admin sees them.

### 4.2.4 Dispute window (admin check)
- Existing: `calls.state=disputed`, `dispositions.admin_confirmed` flag, `POST /api/v1/dispositions/[id]/confirm`. Missing: inbox.
- New `Admin → Disputes` page (`/dashboard/admin/disputes`): table `disputed` calls (caller, campaign, agent `CC1`, duration, dispute reason, wallet impact) + actions `Confirm (payout)` / `Reject (mark failed, no payout)` → updates `wallet_entries` + invoice. Filter `Pending / Confirmed / Rejected`.
- Accept: admin sees every disputed call in one window; agent cannot hide dispute.

### 4.2.5 Recording UX (agent + admin)
- Backend already: `record_calls` flag + `call.recording.saved → store-recording → recordings bucket`. Add agent control: toggle `Record` in softphone `connected` header (`PATCH /calls/[id]` `record_calls`) → Telnyx `client.calls.actions.record_start/stop`.
- Frontend: `Recordings` page already paginated; add filter by `CC1` + agent sees own recordings at `Dashboard → Recordings` (scope by `agent_id` if agent role, all if admin). Fix fetch: ensure `TELNYX_CONNECTION_ID` has `Record = true` and `APP_BASE_URL` is ngrok for `recording.saved` webhook.
- Accept: `connected` call shows `● REC` badge, recording appears in both agent and admin lists with `Download`.

---

## 4.3 Calendar booking after signup (new flow)

**Intent:** After agent registers via invite, they book an onboarding call with client based on admin-configured available dates.

- Tables: `onboarding_slots (id, date, start_time, end_time, capacity, created_by, is_active)` + `onboarding_bookings (id, slot_id, agent_id, status: pending/confirmed/cancelled, created_at)`.
- Admin: `Admin → Settings → Calendar` CRUD slots (date picker, time ranges, capacity), view bookings, confirm/cancel.
- Agent: after `POST /api/v1/invites` register → redirect to `Dashboard → Onboarding → Book Call` (slot picker by date → available times) → `POST /api/v1/onboarding/bookings` → confirmation email via `email-templates.ts` + notification. Slot capacity decrements.
- Worker: reminder job `1h before slot` via `pg-boss` + `event-bridge`.
- Integration option: embed Cal.com/Google Calendar if client prefers (phase 4.3b) — keep native first, swap later.
- Accept: new agent signs up → sees `Book your onboarding call` → picks `2026-08-30 10:30 IST` → admin sees booking in Calendar → both get confirmation.

---

## Prepaid push — product nudges (cross-cutting)

- `Prepaid` plan card: badge `Recommended — Instant calls`, helper `Wallet balance required → routed first (tier 1)`, price prominent.
- `Postpaid` card: muted, label `Dialer Fee` (client Q3/Q5 already); checkout shows `Pay monthly, billed Monday` disclaimer.
- `Take Calls` empty state if `walletEligible=false` on all campaigns: banner `Top up wallet to get calls instantly → Add Funds`.

---

## Definition of Done (Phase 4)

- Each subphase passes: `npm run typecheck` clean, `npm test` green (add 10–15 tests: vertical alias, billing_type enum, CC code gen, hold/mute dtmf, call_notes, disputes inbox, calendar), `npm run build` 139 routes still ok.
- No loss of Phase 0–3 invariants (tenant scope, claimState, idempotent wallet, NPA ping).
- Demo script updated in `CLIENT_UPDATE_2026-08-27.md`.

---

## Execution Order

1. **4.1** Quick wins (labels, billing_type, wallet polling, CC1) — one PR, ship to preview.
2. **4.2** Softphone + disputes + recordings + notes — one PR per item (4.2.1 → 4.2.5).
3. **4.3** Calendar — new migration + APIs + two dashboard pages.
4. Prepaid nudges layered in 4.1 + 4.2 UI passing.
