# Admin Dashboard UI — Deep Scan Audit
Next.js 16 · `src/app/dashboard/admin/*` + `src/app/dashboard/layout.tsx` · 2026-09-03
Focus: **admin efficiency** · All pages read directly (.tsx)

## Layout — `dashboard/layout.tsx` (`adminNavGroups` 4 groups)
- **Nav groups:** PEOPLE (Agencies, Agents→/dashboard/agents, Leads), OPERATIONS (Campaigns, Publishers, Calls, Disputes, Recordings, Scripts, Skills), FINANCE (Plans, Fees, Revenue, Wallet), SYSTEM (Calendar, Reports, Support, CMS, Notifications, Settings, System Settings, Feature Requests) + `AA Admin` shortcut.
- **Layout:** `console` > `sidebar` + `console-main` + `Softphone` + toasts. Role resolved via `GET /api/v1/me` (client-side), redirect admin→/dashboard/admin.
- **Friction:** `AA Admin` active logic excludes 5 paths manually — brittle (disputes/calendar/revenue/fees missing → wrong active state). Many `OPERATIONS` links leave `/admin/*` namespace (Agents/Campaigns/Calls) — mental model split. No server guard → flash. No sidebar scroll/search. 18+ items cramped.
- **Fix:** Replace exclusion list with `pathname.startsWith('/dashboard/admin')`. Add `isActive` exact match for sub-routes. Add admin count badges (pending dispositions/tickets/fees) in sidebar. Make sidebar scrollable + collapse groups. Move to server `layout.tsx` auth check.

---

### 1) `admin/page.tsx` — Overview
- **Purpose:** KPI overview + shortcuts + recent calls.
- **Layout:** 4 stat cards (Calls/Revenue/Campaigns/Online) → 4 manage cards (Users/Agencies/Settings/Reports) → split Quick Actions (4 btns) + System Status (6 rows) → Recent Calls table (5 rows).
- **CRUD:** R only (`GET /reports/summary`, `GET /calls?limit=5`). No CUD.
- **Friction:** Status badges fake static (“Nominal/Receiving/Awaiting”) not health-checked. Manage cards duplicate Quick Actions. No pending-action alerts. Recent Calls no search/pagination — must go to /calls.
- **Suggest:** Make stats clickable → filtered views. Add realtime alert strip: `X pending dispositions | Y open tickets | Z unpaid fees`. Wire real health check endpoint. Auto-poll 30s. Add skeleton → empty CTA distinction.

### 2) `admin/agencies/page.tsx` — Agency Oversight
- **Purpose:** List agencies.
- **Layout:** Header count + `+ New Agency`, filter `select` status, `data-table` 6 cols (Name/Slug/Status/Currency/Retention/Created), `empty-state`, `skeleton`.
- **CRUD:** R (`GET /agencies?status`), C via `/new`. **No U/D** inline.
- **Friction:** No row click/edit, no delete/suspend, no search (name/slug), no pagination/sort — breaks at >50 rows. Filter not synced to URL.
- **Suggest:** Add search (debounced), pagination (reuse `DataTable`), row click → detail drawer, actions kebab: Edit / Suspend / Delete (+confirm). Sync `?status=` to URL. Inline badge colors already good.

### 3) `admin/agencies/new/page.tsx` — Create Agency
- **Purpose:** Create agency.
- **Layout:** Split: left card (Name + Slug auto-generated + hint), right summary DL + error banner + Create/Cancel.
- **CRUD:** C (`POST /agencies {name,slug}`).
- **Friction:** Only 2 fields — table shows currency/retention but not settable here → orphan edit. Slug auto-overwrites manual edit if name changes after. No live uniqueness check. No validation beyond `required`.
- **Suggest:** Add currency + retention inputs, status default. Add slug lock toggle + live availability check (`GET /agencies?slug=`). Add `Create & add another` checkbox. Use modal for speed; add field-level errors.

### 4) `admin/agents/new/page.tsx` (+ list at `dashboard/agents/page.tsx` — admin nav points there)
- **Purpose:** Create agent (admin) + list/approve agents (shared page).
- **List layout:** Search name/email, `+ Invite`, count, 5 filter pills (pending/approved…), `DataTable` 6 cols (availability dot, Name→/agents/:id, Email, Approval badge, Skills, Actions Approve/Decline/Suspend) + pagination 25.
- **Create layout:** Split form: Agency `select`, User `select`, priority number, licenses toggle-btns, skills toggle-btns (from `useSkills`), states 50 toggle-btns; right summary + error + Create/Cancel.
- **CRUD:** R search/status/page, U approval_status (`PATCH /agents/:id`), C (`POST /agents`). No D, no bulk.
- **Friction:** Create: agency defaults to first (silent). User `select` loads *all* users — no search, collapses at 200+ users. Skills/states as wrapping toggle-btn grid — noisy, no select-all. Priority free text. No duplicate-agent check. List: only approval editable; no agency/skill/state filter; search not debounced; per-row actions noisy; 8-char IDs not shown but still used.
- **Suggest:** List: search debounce 300ms, add filters agency/skill/state/availability, add bulk checkbox → bulk Approve/Reject/Suspend, add CSV export. Create: replace selects with async searchable combobox (`/users?search=`), add “create user inline”, states: `All / None / region presets`, skills search, priority stepper, form validation schema + duplicate error handling, convert to stepped modal.

### 5) `admin/publishers/page.tsx` — Publishers + Retreaver
- **Purpose:** CRUD publishers + Retreaver sync/report.
- **Layout:** Header 3 btns (Check status, Sync calls, Sync campaigns) + connection badge, Add form grid 6 cols (Name/Email/afid/Commission%/Fixed ¢/Add), 9-col table (Name/Email/afid/Fixed/Commission/Retreaver badge/Status/Created/Actions 5-6 btns per row), Performance card table (Publisher/Calls/Connected/Payout/Revenue/Margin + totals).
- **CRUD:** C (`POST /publishers`), R (`GET /publishers`, `GET /retreaver/report`), U retreaver_status/active, D delete, provision, invite — **most complete**.
- **Friction:** Densest table — 9 cols + 5 btns wrap, no horizontal scroll. Fixed price in cents confusing ($ vs ¢). No search/filter/pagination. Commission `parseInt` no clamp feedback. Sync has no `last_synced_at`. Report not date-filtered.
- **Suggest:** Collapse row actions → kebab dropdown (Invite/Provision/Pause/Delete). Wrap table in `overflow-x:auto`. Change fixed price input to `$` (convert ×100). Add search + pagination + active filter. Show `last sync` timestamp. Add date range for report. Export CSV.

### 6) `admin/cms/page.tsx` — Content Management
- **Purpose:** Edit public FAQ/Testimonials/Privacy/Terms + generic slugs.
- **Layout:** Split: left Sections table (Slug clickable, Title, Hidden/Active toggle) + New section (slug+title inputs), right Edit panel: title + *structured* FAQ cards (Q/A + Remove/+Add) / Testimonials cards (name/role/quote) / Privacy-Terms markdown textarea + Preview toggle (`mdToHtml` regex) / generic JSON textarea + Save & Publish.
- **CRUD:** R (`GET /cms/admin`), C (`POST`), U (`PATCH ?slug=` + active toggle). No D/history.
- **Friction:** Generic slugs force raw JSON — hostile. Preview only for privacy/terms, not FAQ/testimonials. Active row highlight subtle (`var(--muted)`). No unsaved-changes guard. Custom markdown parser fragile. No search, no delete.
- **Suggest:** Extend structured editors via JSON schema for any slug. Add FAQ accordion preview + testimonials carousel preview. Add markdown toolbar. Add `View live` link. Add search, delete/archive, dirty prompt, revision history/rollback.

### 7) `admin/support/page.tsx` — Support Queue
- **Purpose:** Admin ticket inbox + reply.
- **Layout:** Header Status `select` filter, split: left Tickets `table` (Subject clickable, Status badge, Priority mono, Actions Start/Resolve/Close), right detail card (subject, scrollable replies bordered 360px max, input + Send).
- **CRUD:** R list (`GET /support/tickets?status`) + detail, U status (`PATCH`), C reply (`POST`).
- **Friction:** `table` not `DataTable` → no pagination. Priority as mono text not badge. All 3 action btns always visible (invalid transitions). Reply is single-line `input` not `textarea`. Detail not closable. No search/priority filter/assignee.
- **Suggest:** Add search subject, priority badge colors, pagination, disable irrelevant status btns, closable detail (X), auto-focus + `textarea` with Enter send, bulk status, add ticket timestamps in list, use `DataTable` unified.

### 8) `admin/revenue/page.tsx` — Revenue
- **Purpose:** Paid-invoice revenue trend.
- **Layout:** Header days `select` (7/30/90), 4 stat cards (Total Revenue/Paid Invoices count/Avg-Day/Period), `Sparkline` 720×64 if >1 row, Daily Breakdown `table` (Date/Invoices/Revenue right) reversed.
- **CRUD:** R only (`GET /reports/revenue?days`).
- **Friction:** “Paid Invoices” shows *count* not amount — label misleads. Avg = total/rows but missing zero-days skews. Fixed 720px Sparkline overflows mobile. No custom range, no breakdown by agency/campaign, no export, no compare.
- **Suggest:** Rename to “Invoice Count”. Fill missing dates with 0 for correct avg. Make chart responsive (`width:100%`). Add custom date range + compare vs previous period (% delta). Add CSV export + filter by billing_type.

### 9) `admin/fees/page.tsx` — Agent Fees
- **Purpose:** Pending dialer/software fees + invoice generation.
- **Layout:** Header Generate Monthly + Generate Weekly btns, hint paragraph, Pending Fees `table` (Agent 8-char, Type badge, Amount, Due, Invoice 8-char, Actions Charge/Waive).
- **CRUD:** R (`GET /agent-fees`), U Charge/Waive (`POST /agent-fees/:id/(charge|waive)`), C Generate Monthly/Weekly.
- **Friction:** Agent as 8-char ID — admin blind. No search/filter by kind/due, no pagination, no overdue highlight, global `busy` blocks both generate btns, no confirm for Generate (risk duplicate), no amount edit.
- **Suggest:** Join agent `name/email` (API expand), add search, filter dialer/software, due overdue red badge, per-row `busy`, confirm modal with preview count, inline editable amount for software, bulk charge/waive + pagination + export.

### 10) `admin/dispositions/page.tsx` — Dispositions
- **Purpose:** Review agent outcomes.
- **Layout:** Tabs Pending Review / All, summary card (Pending orange / Confirmed accent / Per-agent badges 6), table (Call 8-char, Agent 8-char, Outcome badge via `DISPOSITION_LABELS`, Notes truncated 200px, Date, Confirm btn or Confirmed badge).
- **CRUD:** R (`GET /dispositions?status=pending` / all), U Confirm (`PATCH /dispositions/:id/confirm` → client removes row).
- **Friction:** Per-agent key = 8-char ID — collisions, unreadable. Notes truncated no tooltip/modal. Tab All still filters summary from tab data only — counts wrong. No search/outcome/date filter, no pagination/sort, no reject, no bulk.
- **Suggest:** Show agent name, add outcome `select` filter + date range + search call/agent, add pagination + sort by date, expandable row for notes (modal), bulk Confirm, fix summary to dedicated stats endpoint, add CSV export.

### 11) `admin/disputes/page.tsx` — Disputes (extra)
- **Purpose:** Disputed calls inbox (terminal `disputed` state).
- **Layout:** Header desc + links View in Calls / Dispositions, filter Pending Disputed / All, table (Started, Call→/calls/:id, Caller hash, Campaign 8-char, Agent 8-char, State badge, Duration, Actions Confirm-payout / Reject).
- **CRUD:** R (`GET /calls?state=disputed`); **U fake** — `handleResolve` only toasts + client `filter` no API.
- **Friction:** “All” tab re-filters to disputed only — no-op. Fake resolve → refresh restores rows (no persistence). No dispute reason/notes. Truncated IDs. No pagination/search. Duration calc may be wrong for live.
- **Suggest:** Implement real `PATCH /calls/:id` or `/disputes/:id/resolve` (confirm vs reject → no payout). Persist, add reason field, add search/pagination, replace IDs with names, add recording link, bulk resolve, audit log.

### 12) `admin/skills/page.tsx` — Skills
- **Purpose:** Skill taxonomy for agents/campaigns.
- **Layout:** Add card (name input + Sort 90px + Add), table (Name/Slug/Sort/Status badge/Created/Actions Enable/Disable + Delete).
- **CRUD:** C (`POST /skills`), R (`GET /skills`), U active (`PATCH`), D (`DELETE`) — **complete**.
- **Friction:** No search/sort/pagination, no inline edit name/sort, sort meaning unlabeled, slug auto server-side not previewed, `confirm()` native not styled, no usage count.
- **Suggest:** Add search + active filter, drag-to-reorder for sort, inline edit, show `agents_using_count`, replace confirm with modal (“Agents keep tag”), add pagination if >50, add slug preview.

### 13) `admin/users/page.tsx` — User Management
- **Purpose:** Membership role & suspend.
- **Layout:** Header search + count, table (User ID 16-char, Agency 8-char, Role `select` 6 options, Status badge, Suspend/Activate btn).
- **CRUD:** R (`GET /memberships`), U role/status (`PATCH /memberships/:id`).
- **Friction:** IDs not names — admin cannot identify user. Search only `user_id` substring + role. No pagination, no role/status/agency filter, immediate role change on `select` — risky (no confirm, super_admin escalation), no create/invite, no bulk, no audit.
- **Suggest:** Join `user.name/email` + `agency.name`, search email/name, add role pills + status filters, pagination 25, confirm modal for role change (especially → super_admin), View Profile link, add created_at + sort, bulk suspend/activate.

### 14) `admin/plans/page.tsx` — Agent Plans
- **Purpose:** Subscription plans prepaid/postpaid.
- **Layout:** Header New Plan toggle, conditional form card (Name, Price $ input live /100, Call Allowance, Billing Type select, Create/Update + Cancel), `DataTable` 6 cols (Name/Price/Allowance/Billing badge/Status badge/Actions Edit/Deactivate/Delete).
- **CRUD:** C (`POST /agent-plans`), R (`GET`), U (`PUT /:id`), soft D (`DELETE` → deactivate) — **full via inline form**.
- **Friction:** Price float (`parseFloat*100`) may drift. Allowance 0 = unlimited not labeled in table. Form pushes table down (not modal). No search/filter by billing_type/active, no duplicate name check, Delete label misleads (soft deact), `DataTable` pagination hardcoded `page 1 / totalPages 1`.
- **Suggest:** Use cents integer + $ display, show “Unlimited” badge for 0, move form to modal, add search + billing_type/active filters, add duplicate validation, rename Delete→Archive, enable real pagination/sort.

### 15) `admin/calendar/page.tsx` — Onboarding Calendar
- **Purpose:** Slots + bookings for post-signup calls.
- **Layout:** Add Slot inline card (Date, Start, End, Capacity 1-100, +Add), Slots table card (Date/Time/Capacity/Booked badge red if full/Status/Deactivate-Delete), Bookings table card (Date/Time/Agent 8-char/Status badge/Confirm-Cancel-Reopen).
- **CRUD:** C slot (`POST /onboarding/slots`), R slots+bookings, U slot active + booking status (`PATCH`), D slot (`DELETE`) — **complete**.
- **Friction:** Stacked tables no pagination/search; Bookings shows 8-char agent not name; no date/status filter; no validation (end>start, past date, overlapping slots); no recurring slot creator; no calendar grid view; no booking detail.
- **Suggest:** Add date + status filters + pagination, join agent name/email, add validation + overlap warning, add recurring creator (weekdays 10-11), capacity utilization bar, booking detail modal, bulk slot delete, optional week-grid calendar view + export.

### 16) `admin/settings/page.tsx` — System Settings + Stripe
- **Purpose:** Payments integration + agency-creation toggle.
- **Layout:** `StripeIntegrationCard` (Connected badge `admin-set`/`env`/Not connected, 2 `password` inputs secret+webhook + Save & Connect), Agency creation card (desc + `toggle` On/Off + Save).
- **CRUD:** R (`GET /settings/stripe` status, `GET /settings/system`), U (`PUT /stripe`, `PATCH /system`).
- **Friction:** Only 2 settings — barren. Keys `type=password` no eye toggle, no test-webhook button, no last-verified timestamp, no prefix validation, globally enables Save even if unchanged, no rotation warning.
- **Suggest:** Add eye toggle, `Test Connection` (show account name), show `updated_at`, validate `sk_…`/`whsec_…` prefixes, disable Save if pristine, add confirm on overwrite, add expected settings (maintenance, retention defaults) when needed.

---

## Cross-cutting Efficiency & Beauty Fixes (priority)
1. **Unified `DataTable`** everywhere — fees/support/disputes/agencies still use raw `<table>`. Standardize pagination 25, sort, skeleton, empty-state.
2. **Search + debounced filter + URL sync** on every list (agencies/users/publishers/fees/dispositions/skills). Persist `?q=&status=&page=` .
3. **Bulk actions**: Agents (approve), Dispositions (confirm), Fees (charge/waive), Users (suspend), Slots (delete/deactivate) — checkbox column + bulk bar.
4. **Modals/drawers** for Create/Edit (agency, plan, publisher, slot) — faster than full-page `new` routes; keep list context.
5. **Replace truncated IDs with names** — join server-side: fees→agent name, dispositions→agent/call, disputes→campaign/agent, users→name/email+agency name, calendar bookings→agent name.
6. **Real filters/pagination**: fees/dispositions/disputes/cms/users/agencies all miss pagination → will collapse at scale.
7. **Loading/empty/validate**: Add skeleton consistency, empty CTA (“No fees — Generate Monthly”), field validation (slug regex, commission 0-100, price 0+, capacity 1-100, date ≥ today, end>start).
8. **Beauty:** Add `empty-state` illustration, badge color system统一 (success/info/warning/danger), use `kebab` overflow for crowded action rows, sticky header + `overflow-x:auto` for wide tables.
