# Plan — 2026 Dashboard Charts + Campaign/Publisher UX Cleanup + 8 Client Feedback Fixes

**Date:** 2026-09-09  
**Project:** Coverage Calls / call-center (`C:\Users\jaisi\Documents\GDS Creatives\call-center`)  
**Sources:** `Downloads/FINAL EXPENSE SALES FRAMEWORK.docx` (13-step, 10.7KB), 8 screenshots (publisher invite, campaign publish, My Wallet, Book Call calendar, Subscriptions/Wallet nav, Scripts, Take Calls, Calls export, Command dashboard), current code (`src/app/dashboard/*`, `script-renderer.ts`, `campaigns` repos, `calls/export`), `graphify-out/GRAPH_REPORT.md` (1077 nodes, 1045 edges, 290 communities, 2026-09-09).

**Global rules (Hermes memory):** `graphify update .` after structural changes, analyze via `graphify query/path/explain` not blind grep, ask on doubt, plan before execute, UI = 2026 modern trends (keep `Poppins/Inter/JetBrains Mono` + `--ground #12071E --panel #1F1037 --line #3A225D --acid #A855F7`), APIs = research latest, optimize tokens without hurting output, complete plan without mid-stop + verify (`tsc --skipLibCheck`, `vitest`, `build`).

---

## 1) Sales Script — “Scripts with Dynamic Feature”

**Doc:** `FINAL EXPENSE SALES FRAMEWORK.docx` → extracted to `docs/plans/script-framework-extracted.txt` (zip parse, 4.4k chars, 13 steps).

**Framework:**
1. Intro & Qualification (age 50-85, bank account, state confirm `[State]`)
2. Build Trust (pen/paper, `[Your Name]` `[Phone Number]` `[NPN Number]`)
3. WHY / pain (funeral vs leave money, burial/cremation)
4. Beneficiary (`[Beneficiary Name]` + relationship, anchor)
5. Explain Process (broker, 50+ carriers: Mutual of Omaha, Americo, Aetna, Royal Neighbors)
6. Health (smoker, DOB, meds → Diabetes/Metformin/Insulin, Heart Attack, Stroke, Cancer, COPD, Kidney, Organ Failure, Hospitalizations 2-4y)
7. Income Qual (working/retired/disability, $/mo, recommend `$X-$Y` premium)
8. Present Options (GOLD $25k-$89, SILVER $20k-$72, BRONZE $15k-$58)
9. Additional Trust (send driver/insurance license + business card via text)
10. Policy Benefits (Whole Life: fixed premium, never decreases, cash value, tax-free death benefit, creditor protected, Day-1 coverage if eligible)
11. Application Info (name, address, email, phone, height/weight, citizenship, DL, SSN, banking, beneficiary)
12. Banking & Effective Date (1st/3rd benefit day, bank/routing/account)
13. Close (submit, confirmation text, “Congratulations approved” → carrier/policy#/coverage/premium/draft/beneficiary, packet 7-10d)

**Current implementation:** `src/server/services/script-renderer.ts` (52 lines) already handles **both** `{{agent_name}}` and `[Your Name]` brackets via `PLACEHOLDER_RE` + `BRACKET_RE` + `ALIAS_MAP` (`your name→agent_name`, `phone number→phone`, `npn→npn`, `state→state`, `beneficiary→beneficiary`). `scriptPlaceholders()` returns 5 vars. `src/app/dashboard/scripts/new/page.tsx` has `campaign_id` select, tags, category. `page.tsx` lists scripts. So **dynamic feature is done**, but discoverability is poor — client screenshot “Scripts” shows `0 scripts` + “No scripts yet” and the `+ New Script` button is top-right small, easy to miss. No in-editor placeholder helper.

**Fix (no new page):** Add placeholder palette in `scripts/new` (chips: `[Your Name]`, `[Phone Number]`, `[NPN Number]`, `[State]`, `[Beneficiary Name]` → insert at cursor), helper text mapping to doc steps, preview with `renderScriptTemplate` live, and empty-state CTA on `scripts/page.tsx` (“Create Final Expense script →”).

---

## 2) 2026 Modern Dashboard Homepages — Small Charts

**Goal:** All 3 consoles show small-form charts (pie/donut, line, bar) for important data, 2026 bento + glass.

**Research (2026 trends, no extra deps beyond `recharts` 3.9.2 already in `package.json` + `Sparkline`):**
- Bento grid: 2×2 or 1×3 small cards, each `card` with `12px` radius, hairline + top highlight, subtle shadow, `recharts` responsive.
- Per-role metrics (keep existing `reports/summary`, `calls-volume`, `duration`, `revenue`, `conversion` + new):
  - **Admin** (`/dashboard/admin` now 4 plain cards): Add `TOTAL CALLS`, `REVENUE` already, plus small line (7-day volume), bar (revenue), pie (calls by state `qualified/missed/ended`), donut (agent availability), conversion mini-bar.
  - **Agent** (`/dashboard` “Good morning, Mahtab”): Already has `Ready` + `Recent Activity` + `7-day volume/duration` sparse. Add donut (my dispositions `sold/follow_up/...`), line (my call volume), bar (my earnings), keep `Go to Softphone` CTA.
  - **Publisher** (`/dashboard/publisher`): Already has `overview` + `payoutTrend` sparkline. Add pie (calls by campaign), line (payout 7d), bar (qualified vs total).

**Implementation:** Reuse `recharts` (`PieChart`, `LineChart`, `BarChart` from `admin-home-charts.tsx` is already dynamic). Create `src/components/dashboard-mini-charts.tsx` (pie/line/bar wrappers, 140-180px height). Wire to existing report endpoints (`/api/v1/reports/*`, `/publisher/overview`). Keep violet/cyan/amber per `data-role`. Add `prefers-reduced-motion` guard. Test at 375/768/1280 via `playwright`/`chrome-devtools`.

**Files:** `src/app/dashboard/page.tsx`, `src/app/dashboard/admin/page.tsx`, `src/app/dashboard/publisher/page.tsx`, new `src/components/dashboard-mini-charts.tsx`, `src/styles/dashboard.css` (bento grid `grid-4` → `bento`).

---

## 3) Campaign / Publisher UX Cleanup (Admin messy)

**Current pain:**
- `src/app/dashboard/campaigns/new/page.tsx`: single-column, `publisherId` single select, pricing + routing cramped, no hint about RTB or assignments.
- `src/app/dashboard/campaigns/[id]/page.tsx`: long split `General` left (routing, price, publisher single select, bid, Retreaver CID, min connect, buffer, record, status) + right 6+ cards (RTB, Retreaver numbers, Endpoints, Assignments, Consent, Danger) — hard to navigate, no tabs, no progress.
- `src/app/dashboard/admin/publishers/page.tsx`: table only, no invite flow highlight.

**Proposed IA (keep same routes, just re-layout, no new deps):**
- `campaigns/new`: 2-step (Step 1 Basic: name + routing + status + record; Step 2 Pricing: `price_cents` + `min_connect`/`buffer`; Step 3 Publishers: **multi-select** checkboxes (already shipped `0043_campaign_publishers` + `publisher_ids`); confirm + create). Colored `eyebrow` progress, sticky save.
- `campaigns/[id]`: **Tabs** (General | Publishers | Bidding | RTB & Numbers | Assignments | Endpoints & Policy). Each tab is a card, tab state via `?tab=` URL. Publishers tab is the new multi-checkbox (already `Save publishers`); General tab keeps routing/price/status/min/buffer/record/CID; Bidding tab isolates `Apply Bid`; Assignments stays; Endpoints/Consent collapsible.
- `admin/publishers`: Keep table, add card header “Invite publisher” CTA, show `retreaver_status` badge, inline `fixed_price_cents`.

**Already shipped:** `0043_campaign_publishers.sql` + `campaigns.getPublisherIds/setPublisherIds` + `publisher_ids` validation + `publishers/route.ts` + UI multi-checkbox (screenshots 2-3 show old single-select `publisher 5 sept` dropdown — now multi).

**Remaining:** Visual tab polish + empty-state hints.

---

## 4) 8 Client Feedback — Root Cause + Fix Plan

### #1 Publisher invite + Under Campaign cannot select more than 1 pubs
- **Screenshot:** `publisher 5 sept` single dropdown.
- **Root:** `campaigns.publisher_id` single FK + UI single `<select>` in `new` + `[id]`.
- **Fix:** ✅ Shipped (2026-09-09): `0043_campaign_publishers` join table (PK `campaign, publisher`, RLS `allow_all`, backfill), `campaigns.ts` `get/setPublisherIds` + `create` with `publisher_ids`, `validate.ts` `publisher_ids`, `POST/PATCH/PUT /campaigns/[id]/publishers` handle multi, UI multi-checkbox in `new` + `[id]`. **Verify** in next manual QA: create campaign with 2 pubs, see both persisted.

### #2 Remove Request Payout — agents buy calls, not paid
- **Screenshot:** `My Wallet` shows `$5.00` + `Request Payout` (blue-purple).
- **Root:** `src/app/dashboard/wallet/agent/page.tsx` renders `Request Payout` for agent role (publisher payout flow leaked).
- **Fix:** Remove `Request Payout` button for `agent` role (keep only `Top Up` + `Pay $1/5/10/25/50`). Keep publisher `payouts` tab untouched. Gate API `POST /wallet/transfer` already checks `hasPermission` but hide UI. **File:** `wallet/agent/page.tsx`.

### #3 Calendar not showing up
- **Screenshot:** `Book your onboarding call` → `All dates (0 slots)` + `No slots available yet. Check back soon — admin adds new weekly slots in Calendar.` + Admin `Calendar` maybe not seed.
- **Root:** `admin/calendar` `onboarding_calendar.sql` (migration 0038) exists but no weekly slots seeded; `onboarding/page.tsx` filters `active=true` only. Not a bug — empty state correct, but admin flow unclear.
- **Fix:** Add prominent empty-state CTA on `admin/calendar` (“+ Create weekly slot” already) + hint on `onboarding` linking `Admin → Calendar`. Add seed helper `npm run seed:calendar` or allow admin to create with `date/start/end/capacity` (already there). No migration needed; manual QA: admin creates 2 slots, agent sees them.

### #4 Subscriptions and Wallet can be in same position
- **Screenshot:** Left nav shows `05f Subscriptions` then `07b My Wallet` separated.
- **Root:** `dashboard/layout.tsx` `agentNav` lists `Subscriptions` `/dashboard/agents/subscription` sep. from `My Wallet` `/dashboard/wallet/agent`.
- **Fix:** Keep two routes but group nav: move `Subscriptions` directly above/inside `My Wallet` (adjacently) or merge UI: `My Wallet` card gets tabs `Balance | Subscriptions` linking to `/dashboard/agents/subscription` content. Change `agentNav` order so `Subscriptions` + `My Wallet` are consecutive (already, but add visual grouping) or combine into one page `Wallet & Subscriptions`. **File:** `layout.tsx` nav order + `wallet/agent/page.tsx` add `Subscriptions` tab.

### #5 Scripts with Dynamic Feature not added
- **Analysis:** See §1 — feature exists (`renderScriptTemplate` handles `[State]` etc.) but UI doesn’t surface it.
- **Fix:** No new page. Add placeholder chips + live preview to `scripts/new/page.tsx`, update empty-state on `scripts/page.tsx` to point to `+ New Script`, keep `src/app/(public)` shells empty (per global rule). **Files:** `scripts/new/page.tsx`, `scripts/page.tsx`.

### #6 State Option is missing — Agents need to select their own state
- **Current:** `agents.states: string[]` exists, but `src/app/dashboard/agents/*` new/edit pages may not expose it. `StateWiseRouting.md` + `npa_states` (355 NPAs) used for routing, but agent self-service missing.
- **Fix:** Add multi-state picker (50 US states) to agent profile (`/dashboard/settings` or `/dashboard/agents/[id]` when self-edit via `updateOwnAgentSchema` which currently only allows `availability` — need to allow `states`). Extend `updateOwnAgentSchema` to `states`, add UI checkboxes on agent `Settings` / `Take Calls → Agent Status`. **Files:** `validate.ts` `updateOwnAgentSchema`, `agents/[id]/route.ts` (permission), `dashboard/settings/page.tsx`, `dashboard/take-calls/page.tsx`.

### #7 Trying to export the Call logs but its not working
- **Screenshot:** `Calls` page + `Recent download history` → `export.json` `Site wasn’t available` `Resume`, `Full download history`.
- **Root:** `src/app/api/v1/calls/export/route.ts` exports `csv` (default) or `xlsx` (`format=xlsx`), but UI maybe fetches `export.json` (`format=json` not handled → 400?) or `agencyId` missing for agent role. Also `calls/route.ts` pagination ok but export may need `agencyId` scoping.
- **Fix:** Ensure `calls/export` handles `format=csv|xlsx` only, returns correct `Content-Disposition`, and respects `context.agencyId`. Add UI export button in `src/app/dashboard/calls/page.tsx` that fetches `/api/v1/calls/export?format=csv` (+ `search/state`) and triggers download (blob URL). Test via `playwright` network.

### #8 When I created a new agent it is still showing the call logs from the other agent
- **Screenshot:** `Good morning, Mahtab` `Recent Activity` shows `ae525576` `f38030656392a4` `ended` etc., same as `Calls` page `ae525576 jai test campaign 1` — leaks across agents.
- **Root:** `src/app/dashboard/page.tsx` `recentCalls` fetches `GET /api/v1/calls?limit=5&sort=started_at:desc` without `agent_id` filter; `isAdmin` branching shows admin `liveCalls` but agent path reuses same unfiltered `recentCalls`. `calls` repo `findMany` supports `agent_id` filter but not passed.
- **Fix:** For agent role, fetch `GET /api/v1/calls?agent_id=${agentId}&limit=5` (get `agentId` from `/api/v1/me` → `body.data.agentId`). Admin keeps unfiltered. **File:** `dashboard/page.tsx`. Also ensure `calls` page defaults to `agent_id` for agent role.

---

## 5) Execution Order (without mid-stop, verify each)

1. **09-09 (today):** #1 already shipped + #2 + #4 nav regroup + #6 state picker (quick) — `tsc --skipLibCheck`, `vitest`, `build 148`, `graphify update` (already 1077 nodes).
2. **Next:** #7 export + #8 agent-scoped logs + Steps from §2 §3 (charts + campaign tab polish) in one pass — delegate charts to subagent (`creative:architecture-diagram` style for `recharts` mini-charts) while main cleans campaign/publisher UX.
3. **After:** Calendar seed helper + scripts placeholder chips (small).

**Token discipline:** Use `graphify query “how does scripts relate to campaigns”` etc. before grep, delegate chart subagent, keep memory clean (only cross-session facts).

---

## 6) Open Questions (ask before coding if doubt)

1. Charts: confirm per-role metrics as in §2, or different?
2. #4: Merge Subscriptions into My Wallet single page (`/dashboard/wallet/agent` tabs) or keep two routes but visually grouped in nav?
3. #6: Full 50-state list or restrict to NPA states relevant to campaigns?
4. Scripts preview: live `renderScriptTemplate` with agent’s own `name/phone/npn/state` from profile, or generic sample vars?

*If doubt, will ask — not guess (global rule).*
