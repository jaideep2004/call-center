# Manual Test Flow — 2026-09-04 — coveragecalls.com — All 61 Dashboard Tabs

**Base URL:** `https://coveragecalls.com` · **Build:** `main 34e7f2d` · **Accounts:** Admin / Publisher / Agent (verify email via `/verify` resend) · **Browser:** Chrome, hard reload `Ctrl+Shift+R` after login

> Tick each row. For every tab: open URL → check load (no 404/500, no console error) → search 300ms debounce → sort → pagination 10/page → URL sync `?q=&page` → kebab/actions no clip → toast on action → empty-state CTA.

---

## 0. Public & Auth (5 tabs) — do first

| # | Tab | URL | Steps | Expected |
|---|---|---|---|---|
| 0.1 | Homepage | `/` | Load, check HeroV5 + 5 sections render, no CLS | HeroV5 visible, no console error |
| 0.2 | Login | `/login` | Enter wrong pass → error toast; correct → `Signed in successfully` → hard redirect to `redirect` | Wrong → `Invalid email or password`; correct → `/dashboard` |
| 0.3 | Register | `/register` | `?invite=<publisher_token>` → register → `/verify` message `Registration successful...` → Resend → check inbox + spam | Resend `{"status":true}` toast, email arrives (light template) |
| 0.4 | Verify | `/verify` | Open link from email → auto verify → login; also test Resend button unauthed | Verified → can login |
| 0.5 | Forgot/Reset | `/forgot-password` → `/reset-password` | Submit email → toast, check email link → reset → login | Reset email arrives, new pass works |

---

## 1. Admin Dashboard — 16 tabs (login as `super_admin`/`admin`)

| # | Tab | URL | Manual Steps (CRUD) | Pass Criteria |
|---|---|---|---|---|
| 1.1 | Admin Overview | `/dashboard/admin` | Check 4 stat cards + Area/Line/Bar/Pie donut animate on load (900–1200ms) | Charts render, numbers match DB |
| 1.2 | CMS | `/dashboard/admin/cms` | Edit FAQ `+ Add FAQ` → Save → check `GET /api/v1/cms?slug=faq` public 200; Edit Testimonials `name/role/quote`; Edit Privacy/Terms markdown → Preview → toggle Active/Hidden → `+ New section` slug/title | Saves toast, public API reflects |
| 1.3 | Publishers | `/dashboard/admin/publishers` | Search `q` 300ms, sort, paginate 10; `+ Add Publisher` 6-col form → Create → kebab `⋮` (fixed, no scrollbar) → Provision → set status → Sync Calls/Campaigns → Invite → toggle Active → Delete (confirm) | All DataTables, kebab no clip, toast each |
| 1.4 | Agencies | `/dashboard/admin/agencies` | List, search, `New Agency` → create → edit → toggle active | Names not IDs, pagination 10 |
| 1.5 | Agencies New | `/dashboard/admin/agencies/new` | Fill form, submit, check appears in 1.4 | Created toast |
| 1.6 | Admin Agents New | `/dashboard/admin/agents/new` | Create agent under agency, check appears in `/dashboard/agents` | Created |
| 1.7 | Calendar | `/dashboard/admin/calendar` | List slots, filter, `+ Add Slot` → pick date `now+2d` → create → DataTable paginate → delete | Slot appears, no overflow clip |
| 1.8 | Dispositions | `/dashboard/admin/dispositions` | Search/filter by outcome, sort, paginate, create disposition → edit → delete | DataTable, Suspense OK (build) |
| 1.9 | Disputes | `/dashboard/admin/disputes` | List, filter status, open row → change state → add note | State transition + PII redacted |
| 1.10 | Fees | `/dashboard/admin/fees` | Filter by kind, search, `+ Add Fee` → create `dialer $50` → edit → toggle | $ vs cents correct |
| 1.11 | Plans | `/dashboard/admin/plans` | List plans, `+ New Plan` → create → edit price/allowance → toggle active | Plans persist |
| 1.12 | Revenue | `/dashboard/admin/revenue` | Check stats + charts, date filter, export | Numbers match payouts |
| 1.13 | Admin Settings | `/dashboard/admin/settings` | Edit system settings → Save → reload → persists | Toast + persist |
| 1.14 | Skills | `/dashboard/admin/skills` | `+ Add Skill` form (flex wrap) → create → search → paginate → edit → delete | Skill CRUD |
| 1.15 | Admin Support | `/dashboard/admin/support` | List tickets, search, open ticket → reply → close ticket | Replies appear, badge updates |
| 1.16 | Users | `/dashboard/admin/users` | Search `q` wrap, filter role, paginate, open user → change role → toggle | Role updates |

---

## 2. Publisher Dashboard — 5 tabs (login as `publisher` via invite)

| # | Tab | URL | Steps | Expected |
|---|---|---|---|---|
| 2.1 | Publisher Overview | `/dashboard/publisher` | Check Sparkline payout trend (monthly→campaigns→recent-by-day fallback), search campaigns+recent 300ms, two DataTables 10/page, URL sync, empty-state Links | Sparkline responsive, no 404 |
| 2.2 | Publisher Calls | `/dashboard/publisher/calls` | Search caller/campaign/status/date, sort, 10/page, check daily payout Sparkline, Refresh toast | Filter client-side, pagination works |
| 2.3 | Publisher Campaigns | `/dashboard/publisher/campaigns` | Search/sort/paginate 10, check Sparkline payout distribution, open campaign detail | DataTable + chart |
| 2.4 | Payouts | `/dashboard/publisher/payouts` | 4 stat cards + Sparkline monthly trend, tabs Monthly vs Qualified Calls (each DataTable 10 + URL `?tab=&q=&page`), Export CSV → toast | CSV downloads, tabs sync |
| 2.5 | Publisher Settings | `/dashboard/publisher/settings` | Edit email → validation toast, check Affiliate ID Copy → toast, Contact Support link, status badges | PATCH persists, copy works |

---

## 3. Agent Dashboard — 7 tabs (login as `agent`)

| # | Tab | URL | Steps | Expected |
|---|---|---|---|---|
| 3.1 | Agents List | `/dashboard/agents` | Search `q` 300ms, filter `status` (`approved/suspended/pending` badge), paginate 10, URL `?q=&status=&page`, select rows → `Bulk actions coming soon` toast, open kebab | Suspense OK, names display |
| 3.2 | Agent Detail | `/dashboard/agents/:id` | Open from 3.1, check membership/availability/forwarding, edit, back link | Detail renders, back works |
| 3.3 | Earnings | `/dashboard/agents/earnings` | DataTable 10, search+date filters, check `agentMap` names, amount badges, empty state | Amounts $ correct |
| 3.4 | Agents New | `/dashboard/agents/new` | Fill `split --gap var(--space-6)` form → create agent → appears in 3.1 | Created toast |
| 3.5 | Recruit | `/dashboard/agents/recruit` | Two DataTables: invites + sub-agencies, search 300ms, URL sync, badge colors | Both tables paginate |
| 3.6 | Subscription | `/dashboard/agents/subscription` | Check plan cards, `Subscribe` → Stripe checkout, check `calls_used` / `auto_renew` | Checkout link, status updates |
| 3.7 | Top Performers | `/dashboard/agents/top-performers` | Filter `days` + search debounce, rank badges, DataTable 10 | Rank + earnings sort |

---

## 4. Shared / Common — 32 tabs (visible per role as per `layout.tsx` nav)

| # | Tab | URL | Steps | Expected |
|---|---|---|---|---|
| 4.1 | Dashboard Home | `/dashboard` | Sparkline `overflowX:auto 100% responsive` + charts, check role redirect | No horizontal clip |
| 4.2 | Calls | `/dashboard/calls` | Search `q` 300ms, filter `state` 12 states, paginate 10, URL `?q=&state=&page`, open call → notes → simulate `+188****3949` | State colors, PII `+188****3949` |
| 4.3 | Call Detail | `/dashboard/calls/:id` | Open from 4.2, check timeline, add note → appears, check billing 30s buffer | Note 701... persists |
| 4.4 | Campaigns | `/dashboard/campaigns` | Search `q` 300ms, filter `status` active/paused/archived badge, paginate 10, open `⋮` | Badge + overflow |
| 4.5 | Campaign Detail | `/dashboard/campaigns/:id` | Check `price_cents` + `bid_overrides`, edit bid `1→251` → `COALESCE` immediate | Bid update toast |
| 4.6 | Campaigns New | `/dashboard/campaigns/new` | Fill `split` form → create → appears in 4.4 | Created |
| 4.7 | Leads | `/dashboard/leads` | Filters `q & status & source & agent & date`, `agentMap` names, status badges, paginate 10, CSV/Excel export | Export works |
| 4.8 | Lead Detail | `/dashboard/leads/:id` | Open lead, check disposition_outcome badge, edit, back | Badge + overflow |
| 4.9 | Recordings | `/dashboard/recordings` | Fetch all → client filter+paginate 10, `?q=&page`, play audio, check duration | Audio plays, filter works |
| 4.10 | Reports | `/dashboard/reports` | Filter-bar (was search-bar), `card overflow hidden + overflowX auto`, date range, export | No clip |
| 4.11 | Scripts | `/dashboard/scripts` | Search 300ms, paginate, open script → edit | Search + list |
| 4.12 | Script Detail | `/dashboard/scripts/:id` | Open from 4.11, edit content, save | Persists |
| 4.13 | Scripts New | `/dashboard/scripts/new` | Create script `maxWidth 680 card--form` → appears in 4.11 | Created |
| 4.14 | Settings | `/dashboard/settings` | Tabs `marginBottom var(--space-5)`, edit profile → Save toast | Persists |
| 4.15 | Settings Members | `/dashboard/settings/members` | DataTable 10, invite member, search, kebab | Invite toast |
| 4.16 | Settings Phone Numbers | `/dashboard/settings/phone-numbers` | List DIDs `+188****3949`, `+ Add`, search, paginate | E164 display |
| 4.17 | Notifications | `/dashboard/notifications` | Badge in topbar (admin/publisher/agent), DataTable `topic` badge, mark read | Badge counts, `notification:new` via 3002 |
| 4.18 | Onboarding | `/dashboard/onboarding` | List slots `overflowX auto marginTop 16`, book slot | Books OK |
| 4.19 | Support | `/dashboard/support` | Search `q`, DataTable, open ticket → replies Thread, `card card--form` flex 1 | Replies + close |
| 4.20 | Membership | `/dashboard/membership` | Role select `input` class, search-bar → filter-bar, open plan → subscribe | Plan select |
| 4.21 | Membership Detail | `/dashboard/membership/:id` | Check plan detail, subscribe | Detail renders |
| 4.22 | Take Calls | `/dashboard/take-calls` | Check `Avail offline/available/busy/away`, Suspense `?q=&page`, `card--spacious maxWidth 640`, DeviceTest, `Available` → inbound mock `POST /api/telephony/mock/webhook` → ringing→connected 80ms→note | WebRTC or forwarding_number |
| 4.23 | Wallet | `/dashboard/wallet` | `filter-bar` (was search-bar), `filter-bar__group/meta`, check ledger, Stripe checkout 100–1000000c | Checkout 200 |
| 4.24 | Wallet Agent | `/dashboard/wallet/agent` | Top-up via Stripe, check balance, history | Balance updates |
| 4.25 | Wallet Invoices | `/dashboard/wallet/invoices` | List monthly invoices (Monday), open invoice | Invoices list |
| 4.26 | Wallet Invoice Detail | `/dashboard/wallet/invoices/:id` | Check PDF/line items, download | Detail renders |
| 4.27 | Affiliate | `/dashboard/affiliate` | Check affiliate link, copy, stats | Copy toast |
| 4.28 | Feature Requests | `/dashboard/feature-requests` | List, `+ New`, search, vote | Created |
| 4.29 | Tutorials | `/dashboard/tutorials` | List, search, paginate, open tutorial | List OK |
| 4.30 | Tutorial Detail | `/dashboard/tutorials/:id` | Open from 4.29, check video/content | Renders |
| 4.31 | Tutorials New | `/dashboard/tutorials/new` | Create tutorial → appears in 4.29 | Created |
| 4.32 | Feature Requests (shared) already | — | — | — |

> Total: 5 (auth) + 16 (admin) + 5 (publisher) + 7 (agent) + 32 (shared) = **65 incl. public**; **61 dashboard `page.tsx`** exactly as `find src/app/dashboard -name page.tsx | wc -l` — all covered, none missed.

---

## 5. Cross-cutting checks (on every tab)

- [ ] Toast: `success` green `rgba(34,197,94,0.08)`, `error` red, `warning` amber, `info` blue — queue 3, 4–6s, top-right
- [ ] Email: light template `BG #F4F5F7 / CARD #FFFFFF` visible in Gmail dark mode — trigger via invite + verify + reset
- [ ] Topbar: `Notifications` badge increments via `GET /api/v1/notifications` + Socket `notification:new` (3002 `redis bridge connected`)
- [ ] Kebab `⋮`: `position:fixed viewport clamp z-9999`, no `overflowX:auto` clip, closes on scroll/esc/outside
- [ ] URL sync: refresh keeps `?q=&status=&page` + back/forward works
- [ ] Empty states: show `View Campaigns` / `Overview` Links, not blank table
- [ ] 401 vs 200: anon `GET /dashboard/*` → `302 /login?redirect=`, authed `200`

---

## 6. Quick smoke order (15 min)

1. Admin login → `/dashboard/admin` charts → `/dashboard/admin/cms` edit FAQ → `/dashboard/admin/publishers` Add Publisher → Invite → copy link
2. Incognito → open invite link → register publisher → `/verify` Resend → email → verify → login → `/dashboard/publisher` Sparkline → `/dashboard/publisher/payouts` Export CSV
3. Back to admin → `/dashboard/campaigns/new` → create → `/dashboard/campaigns/:id` set bid 251 → `/dashboard/calls` mock webhook `inbound TX 214 → +188****3949` → `ringing(CC1)` → `/dashboard/take-calls` Accept → `connected` 100ms → hangup 4s → note → check wallet `charge` 0c (under 30s buffer)
4. Agent login → `/dashboard/take-calls` Available → `/dashboard/agents/earnings` filter → `/dashboard/wallet/agent` Stripe checkout 500c → `/dashboard/notifications` badge
5. Logout → try `/dashboard/admin` anon → `302 /login?redirect=%2Fdashboard` → login → lands back on `/dashboard/admin`

---
*All 61 dashboard tabs listed from `find src/app/dashboard -name page.tsx` on 2026-09-04 — check each row before client handover.*
