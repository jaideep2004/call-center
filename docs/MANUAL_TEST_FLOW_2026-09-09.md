# Manual Test Flow — Coverage Calls (2026-09-09)
> Covers every edit done 2026-09-09 + full project regression. Run in order. Keep dev on `http://localhost:30001` (scripts/dev.js picks 30001 if 3000 taken — check terminal banner). DB is Supabase pooler `aws-1-ap-south-1.pooler.supabase.com` (remote).

Pre-flight: `npm run typecheck` 0, `npm test` 409 pass | 5 skipped, `npm run build` 148 routes — must be green before manual.

---

## 0) Boot & Env
- [ ] **0.1** `.env` from `.env.example` — `DATABASE_URL` = Supabase pooler, `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL=http://localhost:30001` set. `BETTER_AUTH_URL` must match the **actual** Next port (30001, not 3000) or cookies fail and login loops.
- [ ] **0.2** `npm run dev` — expect: `realtime-gateway ready on 3002`, `call-worker ready`, `Next.js on port: 30001`, `Ready in ~500ms`. `redis: docker not found` warning is OK (falls back to HTTP bridge).
- [ ] **0.3** `curl http://localhost:30001/api/v1/health` → `{"status":"ok"}` <50ms (proxy skips health via matcher `/((?!...|api/auth|api/v1/health).*)/`)
- [ ] **0.4** `curl http://localhost:30001/api/auth/get-session` → `null` (unauth) ~20ms — proves `api/auth` bypasses proxy (if this is 1-2s, matcher regression).

## 1) Homepage & Public (no auth)
- [ ] **1.1** `GET /` → hero `Every qualified call. Exactly where it belongs.` + `Start 7-day free trial → /register` + `Watch demo → /#how-it-works`
- [ ] **1.2** Header (both `HeroV5` pill + `site-header`): `How it Works → /#how-it-works`, `Features → /#features`, `Pricing → /#pricing`, `Testimonials → /#testimonials`, `About → /about`, `Log in → /login`, `Start free trial → /register`. No dropdowns.
- [ ] **1.3** Click `How it Works` → smooth scroll to `#how-it-works` (≈88px offset, URL `/#how-it-works`). Repeat `Pricing` → `#pricing`, `Features` → `#features`, `Testimonials` → `#testimonials`. Verify `scroll-behavior: smooth` + no full reload. Back button returns to `/`.
- [ ] **1.4** Footer (CoverageFooterCTA + site-footer): Product `Features /#features, Pricing /#pricing, FAQ /faq`; Company `About Us /about, Why Choose Us /why-choose-us, Testimonials /#testimonials`; Legal `Privacy /privacy, Terms /terms, Contact /contact`; Socials `https://x.com`, `https://linkedin.com`. Grid 5-col on desktop, stacked on mobile.
- [ ] **1.5** All 9 public pages render **empty shell** (no dummy content): `/about`, `/contact`, `/faq`, `/how-it-works`, `/pricing`, `/privacy`, `/terms`, `/testimonials`, `/why-choose-us` → title correct, `h1` = page name, body `Content coming soon. This page is reserved — check back shortly or explore the homepage.` + `Back to homepage → /#how-it-works`. `/contact` currently also empty (form removed per 2026-09-09 plan — if you need the lead form back, keep it functional).
- [ ] **1.6** Footer/header from any public page: anchor `/#how-it-works` still works (absolute `/` prefix).
- [ ] **1.7** Responsive: 375 / 768 / 1280 — no horizontal scroll, nav pill `border-radius: 9999px`, hero stacks correctly.

## 2) Auth — 2026 Redesign (login speed focus)
> New: split editorial (left) + card (right). Editorial: `01 — ACCESS/BEGIN/RECOVER/SECURE/VERIFY`, headline `Where every call finds its answer.` (login) / `Start taking better calls.` (register) + 3 hairline rules (Route/Answer/Close) + trust bar `Trusted by growing teams · 4.9/5 · Setup in minutes`. Card: hairline + top highlight + soft shadow, 12px radius, grain via `auth-shell::after`.

- [ ] **2.1** `GET /login` → layout `auth-split` 2-col on desktop (585px + 498px), single-col stacked on mobile (332px), `900ms` animation with `prefers-reduced-motion` guard.
- [ ] **2.2** `GET /register` / `/forgot-password` / `/reset-password?token=bad` / `/verify` — same shell, eyebrow correct (`Create account — 01`, `Reset password — 02`, `Invalid link — 02`, `Verify — 03`).
- [ ] **2.3** A11y: every `label for` matches `input id`, `autocomplete` = `email`/`current-password`/`new-password`/`name`, `Skip to content` link present, `aria-live: polite` toasts, `aria-busy` on submit, `aria-invalid` on error, `autocomplete correct, paste not blocked, 1Password supported` hint, `:focus-visible` ring `rgba(var(--accent-rgb),.16)`, 16px mobile inputs (no iOS zoom), `touch-action: manipulation`.
- [ ] **2.4** Colors/fonts preserved: `--ground #12071E`, `--panel #1F1037`, `--line #3A225D`, `--acid #A855F7`, `Poppins 600` headline `letter-spacing -0.055em`, `Inter` body, `JetBrains Mono` mono 11px.
- [ ] **2.5** Login flow: fill `you@agency.com` / `••••••••` → `Sign in` → spinner keeps label `Signing in…` + spinner, not just spinner.
  - [ ] **2.5.1** Success → `Signed in successfully` toast → `window.location.href = /dashboard` hard reload (so proxy sees fresh `__Secure-better-auth.session_token`). Verify no double-submit (button `disabled` while `loading`).
  - [ ] **2.5.2** Bad password → error banner `role=alert` + toast `Invalid email or password`, `loading` reset, form stays filled.
  - [ ] **2.5.3** Unverified email (when SMTP on) → `Please verify your email before signing in.` + stays on login.
- [ ] **2.6** Register: `name` + `email` + `password >=8` → `Create account` → verification email sent (if SMTP) → `/verify` shows `Check your inbox` + `Resend` with `resend-email` input.
- [ ] **2.7** Forgot: `POST /forgot-password` → `Send reset link` → success banner; `Reset` with token → `Choose strong password` → redirect to login.
- [ ] **2.8** Auth guard: `GET /dashboard` without cookie → `302 /login?redirect=%2Fdashboard`. `GET /login` with cookie → `302 /dashboard`. `GET /api/auth/*` does NOT set `x-authenticated` header via proxy (matcher excludes it).
- [ ] **2.9** **LOGIN SPEED — why it spins long on localhost** (see §9).

## 3) Dashboard — per-role (requires seeded users)
> Seed: `npm run migrate && npm run seed` → admin `admin@coverage.test` / `Admin123!`, agent `agent@coverage.test`, publisher `publisher@coverage.test` (check `app.memberships`). Or create via `POST /api/v1/setup/make-admin` with `x-setup-token` before first admin.

- [ ] **3.1** Login as **admin** → `/dashboard/admin`:
  - [ ] Metrics 4 cards: `TOTAL CALLS` + `TOTAL REVENUE` now each embed a spark (`MiniLine` 7-day volume, `MiniBar` 7-day revenue, 140px, per-role violet `var(--accent)`), plus `ACTIVE CAMPAIGNS` + `AGENTS ONLINE`.
  - [ ] Bento `mini-bento--admin` 3 cards: `Call states` pie (recent 80 `state` distribution), `Agent availability` donut (center `agents_online`), `Revenue trend` bar (7d). Resize to 375 → 1-col, 960 → 2-col. `prefers-reduced-motion: reduce` disables recharts animation.
  - [ ] Quick links 4: Manage Users/Agencies/Campaigns/Support.

- [ ] **3.2** Login as **agent** → `/dashboard` (Good morning, Mahtab):
  - [ ] `Ready → Available` toggle + `Recent Activity` + `7-day volume/duration` retained.
  - [ ] **NEW** `MY ANALYTICS` bento: `My dispositions` donut (6 buckets `sold/follow_up/no_answer` … center total), `My call volume` line (7d), `My earnings` bar (7d `revenue_cents/100`). Uses fallback demo `[{sold:2,follow_up:1,no_answer:1}]` if no dispositions yet.
  - [ ] `Go to Softphone` CTA present. **Fix #8**: `Recent Activity` now calls `GET /api/v1/calls?agent_id=<me>&limit=5` (derived from `/api/v1/me` `agentId`), so new agent `Mahtab` does NOT see `ae525576 jai test campaign 1` from another agent. Verify by creating agent `jaisi2@test.com`, login, see empty or own calls only.

- [ ] **3.3** Login as **publisher** → `/dashboard/publisher`:
  - [ ] `Overview` + `payoutTrend` sparkline retained.
  - [ ] **NEW** `Publisher analytics bento`: `Payout by campaign` pie (top 6 by `payout_cents`), `Payout trend` line (monthly or per-campaign fallback), `Qualified vs total` bar (6 campaigns `qualified_calls`). Labels `no payouts yet` when empty.

- [ ] **3.4** **Nav grouping — Fix #4**: `dashboard/layout.tsx` agent nav now has `BILLING` glass box containing `My Wallet` + `Subscriptions` consecutively (was separated `05f` between). `My Wallet` page `/dashboard/wallet/agent` has tabs `Balance | Subscriptions → /dashboard/agents/subscription`. Console top has 1px `linear-gradient(90deg, transparent, rgba(168,85,247,.22), transparent)` accent + `console` `position: relative`.

## 4) Campaigns & Publishers — Fix #1 (multi-publisher, the messy admin)
> Migration `0043_campaign_publishers` (join PK `campaign, publisher`, RLS `allow_all`, backfills legacy `publisher_id` → first join row). Repo `getPublisherIds/setPublisherIds` keeps `campaigns.publisher_id` = first join for backward compat. API: `POST/PATCH` accepts `publisher_ids: string[]` (fallback `publisher_id`), `PUT /api/v1/campaigns/[id]/publishers {publisher_ids: [...]}`. Validate `publisher_ids` via `validate.ts`.

- [ ] **4.1** As admin `POST /api/v1/campaigns { name: "FE Gold", routing_strategy: "priority", price_cents: 1500, publisher_ids: ["pubA","pubB"] }` → 201, `GET /api/v1/campaigns/[id]/publishers` → `["pubA","pubB"]`, `campaign.publisher_id === "pubA"` (legacy).
- [ ] **4.2** UI `GET /dashboard/campaigns/new`: 2-step — Step 1 Basic (name/routing/status/record), Step 2 Pricing (`price_cents` + `min_connect`/`buffer`) + Publishers multi-checkbox list (badge `N selected`, `No publishers yet — create one in Admin → Publishers.`), hint `campaign_publishers join (multi-select)`. Pricing shown in summary `Will create at $15.00/call • 2 publishers`. Create → list shows `FE Gold`.
- [ ] **4.3** `GET /dashboard/campaigns/[id]`: Tabs `General | Publishers | Bidding | RTB & Numbers | Assignments | Endpoints & Policy` via `?tab=` URL. `Publishers` tab is multi-checkbox `Save publishers` (calls `PUT publishers`). `General` keeps routing/price/status/min/buffer/record/CID. `Bidding` isolates `Apply Bid`. Verify switching tab updates URL and keeps state. **Old screenshot `publisher 5 sept` single dropdown is gone.**
- [ ] **4.4** `GET /dashboard/admin/publishers`: header `Invite traffic partners…` + `+ Invite publisher` (scrolls to form), `Invite` button per row copies link, table now shows `retreaver_status` badge + `fixed_price_cents`.
- [ ] **4.5** `GET /api/v1/campaigns/findByPublisher?publisherId=pubA` uses `LEFT JOIN app.campaign_publishers` so both legacy and join rows resolve.

## 5) Wallet — Fix #2 (Request Payout leak)
- [ ] **5.1** As **agent** `GET /dashboard/wallet/agent`: balance `$5.00` + tabs `Balance | Subscriptions`, grid shows `+ $5 this week` + `View Subscriptions →`, **no `Request Payout` button** (removed — agents buy calls, not paid). `Top Up` + `Pay $1/5/10/25/50` remain.
- [ ] **5.2** As **publisher** `GET /dashboard/publisher/payouts` + agent `GET /dashboard/agents/subscription` untouched.
- [ ] **5.3** `POST /api/v1/wallet/transfer` as agent → 403 `hasPermission` (UI hidden, API still gated). As publisher → allowed.

## 6) Scripts — Fix #5 (dynamic feature was there, now surfaced)
> `script-renderer.ts` already handles `{{agent_name}}` + `[Your Name]` via `PLACEHOLDER_RE + BRACKET_RE + ALIAS_MAP`. Fix surfaces it.

- [ ] **6.1** `GET /dashboard/scripts` → `0 scripts` empty-state now has `Create Final Expense script →` CTA (was tiny `+ New Script` top-right only).
- [ ] **6.2** `GET /dashboard/scripts/new`: campaign select + tags + category, **chips** `+ [Your Name]` `+ [Phone Number]` `+ [NPN Number]` `+ [State]` `+ [Beneficiary Name]` (click inserts at cursor via `textareaRef`). Hint `13-step: intro, trust, WHY, beneficiary…`. Type `Hello [Your Name] ([NPN Number]) from [State] beneficiary [Beneficiary Name] at [Phone Number]` → live preview card `LIVE PREVIEW — filled with sample agent` shows `Alex Johnson (12345678) from CA … +1 (555) 0142`. Also supports `{{agent_name}}`.
- [ ] **6.3** Create → list shows script, `GET /api/v1/scripts/[id]` renders via `renderScriptTemplate`.

## 7) State Picker — Fix #6 (agents pick licensed states)
> `lib/us-states.ts` 51 (50 + DC), `validate.ts US_STATE_CODES` + `updateOwnAgentSchema { states: string[].max(60) }`, UI in `settings`, `take-calls`, `agents/[id]`.

- [ ] **7.1** As agent `GET /dashboard/settings`: `Licensed States` card → `Any state (no restriction)` or badges `TX` `CA`. `Edit states` → 51 badges grid `maxHeight 220` scroll, click to toggle (`badge-success` when on), `Save` → `PATCH /api/v1/agents/[id] { states: ["CA","TX"] }` → `States updated` toast, badges persist. `Clear all` → empty.
- [ ] **7.2** `GET /dashboard/take-calls`: `Agent Status` panel → `Licensed States` + `Edit` → same picker `maxHeight 200`, `Save states` → updates `agentInfo.states` and `statesDraft`.
- [ ] **7.3** As admin `GET /dashboard/agents/[id]` (self-edit via `updateOwnAgentSchema` — allows `availability` + `states` only, strips `approval_status/priority`): verify escalation blocked (`role-play-edge-cases.test.ts`).
- [ ] **7.4** Routing: `POST /api/webhooks/retreaver/ping { DID, caller NPA 214 (TX)}` with agent `states: ["CA"]` → `state_mismatch` reject (via `selectAgent`).

## 8) Calls Export — Fix #7 (Site wasn't available)
> `calls/export` now `format csv|xlsx` only → `400 Unsupported export format "json"`, enforces `context.agencyId` → `403 Agency scope required`, plus `Cache-Control: no-store`, `Content-Disposition: attachment; filename="calls-export-…csv|xlsx"`; UI `calls/page.tsx` `handleExport` blob download.

- [ ] **8.1** `GET /dashboard/calls`: filter bar has `state` select + search + `CSV`/`Excel` buttons (was `<a href=… download>`). Click `CSV` → fetch `?&format=csv&state=…&search=…`, blob `calls-export-…csv`, `text/csv` header, success toast `CSV downloaded`. `Excel` → `xlsx` similarly.
- [ ] **8.2** Unauth `GET /api/v1/calls/export?format=json` → `400` (was 500 / `Site wasn't available` + `export.json` resume). Unauth `?format=csv` → `401 Authentication required` (via `fail`), not 500. Authed agent `GET ?format=csv&state=connected&search=214` → scoped to `agencyId`, no IDOR.
- [ ] **8.3** `GET /api/v1/calls?page=1&limit=5&sortBy=started_at&order=desc` live queue + `?sortBy=started_at;--` → `400` (allowlist).

## 9) Calendar — Fix #3 (All dates 0 slots was correct empty state)
- [ ] **9.1** As agent `GET /dashboard/onboarding`: `All dates (0 slots)` now shows `No slots available yet…` + `Contact Support` + `Admin → Calendar` link + `Tip: Admin creates weekly slots in Admin → Calendar…` + `Clear filters` when filtered.
- [ ] **9.2** As admin `GET /dashboard/admin/calendar`: form `date/start/end/capacity` + `Active` toggle, empty `No weekly slots yet — Create your first… (date + start/end + capacity). Agents see active slots in Book Call → Onboarding…` + `Tip: Add 2–3 weekly slots capacity 3–5`.
- [ ] **9.3** Admin create 2 slots `2026-09-10 10:00-11:00 cap 3 Active` + `2026-09-11 14:00-15:00` → agent sees them, book → `POST /api/v1/onboarding/bookings` → confirmation + `1h reminder` (worker).

## 10) Perf & Infra
- [ ] **10.1** `GET /_next/static/*` → proxy `isStaticAsset` early return (no session work).
- [ ] **10.2** No `client.query` concurrent deprecation in `routeCall` logs, `communication_logs` rename handled, `NPA 355` seed OK.

---

## Why login spins long on localhost (root cause)

You measured `GET /api/auth/get-session` 1931ms on `localhost:30001` via playwright — that's the sign-in path too.

1. **Remote DB (biggest)** — `DATABASE_URL` is `aws-1-ap-south-1.pooler.supabase.com` (Supabase pooler) hitting AP-South from your machine. Every `authClient.signIn.email` does: `Kysely pool.query('SELECT … FROM better_auth.user WHERE email=')` + `bcrypt verify` (≈300ms CPU) + `INSERT session`. Cold pool = extra ~400ms TLS. That's 1.2–1.9s normal for a pooler over public internet — you saw `1931ms`. Local `localhost:5432` would be ~40ms.

2. **Old two pools — FIXED 2026-09-09** — Before fix `src/server/auth.ts` did `new Pool({connectionString})` separate from `src/server/db.ts: max 20`. Two pools doubled cold starts & connections. Now `import { pool } from "./db"` — one pool, one warm set.

3. **Proxy running on every request — FIXED** — Before fix matcher was `/((?!_next/static|...).*)/` so even `POST /api/auth/sign-in/email` ran `proxy.ts` (cookie parse + `x-robots-tag` headers). Not DB, but added latency. Now `"/((?!_next/static|_next/image|favicon.ico|api/auth|api/v1/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)/"` — health + auth bypass proxy (health 19.5ms warm vs 1.9s before).

4. **Hard reload — intentional but feels slow in dev** — `login/page.tsx: showToast → window.location.href = redirect` does a full reload so `proxy.ts` sees the fresh `__Secure-better-auth.session_token` (comment: `router.push keeps stale cache`). In dev Turbopack that reload is `3.1s` on first hit (`GET / 200 in 3.5s (next.js: 3.1s)` then `94ms` warm). Production is ~150ms. Spinner is `setLoading(true)` until the reload navigates — so you see the full 1.9s (DB) + 0–3s (dev compile) as "spinning".

**Fixes already shipped:** pool share + matcher skip. **To make localhost feel fast today:**
- Keep `BETTER_AUTH_URL=http://localhost:30001` matched to actual dev port (you're on 30001, not 3000 — mismatch causes extra redirect loop).
- Leave `window.location.href` — it's correct for cookie, but add a min-visible spinner so it doesn't flash: the new login already keeps label + spinner `Signing in…` and `aria-busy`.
- If you want sub-400ms locally, point `DATABASE_URL` to a local Postgres for dev and keep Supabase only for `production`. Or keep pooler but expect 1-2s cold; warm second login should be ~800ms (try login twice quickly — second should be <1s).

Quick self-measure: DevTools → Network → `sign-in/email` → TTFB. If TTFB >900ms and DB is pooler, it's network, not code. If `get-session` is also 1.9s after warm, restart dev (`npm run dev`) — old modules stale (known: `PID 4388` stale 1.5.7 note).
