# Plan — Nav Links (empty pages + anchors) + Auth 2026 Redesign + Login Speed

**Date:** 2026-09-09
**Project:** Coverage Calls / call-center
**Scope:** header/footer real links (home) cleaned, new public pages kept empty, smooth-scroll anchors for homepage-only sections, login/signup/forgot modern 2026 redesign, login slowness audit, memory/graphify discipline.

> **Memory / Global rules registered** (see Hermes memory): always `graphify update .` after structural changes, analyze via `graphify-out/GRAPH_REPORT.md` + `graphify query/path/explain` instead of blind scans, keep memory clean, ask on doubt, always plan before execute, UI = 2026 modern trends (keep font+colors), APIs = research latest trends first, optimize tokens without hurting output/performance.

---

## 1) What you asked (restated)

1. **New public pages stay empty** — only links in header/footer. You will provide page content + designed components later. Do not build full page content now.
2. **Some sections are homepage-anchor only** (smooth scroll on `/` instead of creating a separate page).
3. **Auth needs 2026-modern redesign:** `login`, `register` (signup), `forgot-password` (and `reset-password`, `verify` for consistency) — researched against 2026 trends, keep **font family** (`Poppins` serif/display + `Inter` sans + `JetBrains Mono` mono) and **color scheme** (`--ground #12071E, --panel #1F1037, --line #3A225D, --acid #A855F7, --cyan, --amber` + homepage tokens).
4. **Login feels slow** — audit if we have optimization, propose fixes.
5. **Design skills:** use `C:\Users\jaisi\.claude\skills` — specifically `bencium-innovative-ux-designer` + `web-interface-guidelines`.

---

## 2) Decisions already made (from this session)

* **MCPs:** `playwright` (24 tools) + `chrome-devtools` (29 tools) installed via `hermes mcp add` — enabled, takes effect next session. Will use for auth visual regression + interaction testing, not blind guessing.
* **Previous nav cleanup (done, will be refined to this plan):**
  * `HeroV5.tsx` header: replaced dummy dropdowns (Product/Solutions/Resources/Company with `ChevronDown`) with real links. Current live header is: `How it Works / Pricing / Why Us / FAQ / Contact + Log in / Start free trial (→ /register)`. CTA buttons in hero now link to `/register` and `/how-it-works`.
  * `CoverageFooterCTA.tsx` (homepage footer): removed dummy `Integrations/Security/Roadmap/Agents/Agencies/Insurance/Call Centers/Blog/Help Center/Guides/API Docs/Careers` — now 3 cols: Product (How it Works, Pricing, Why Choose Us) + Company (About, Testimonials, Contact) + Resources (FAQ, Privacy, Terms) + newsletter. Grid changed from 6 to 5 cols. Socials → real `https://x.com`, `https://linkedin.com`, `/contact` mail. CTA buttons → `/register`, `/how-it-works`. Socials pruned from 4 to 3.
  * `site-header.tsx` (public pages): `/#features` → `/how-it-works`, labels renamed to How it Works / Pricing / Why Choose Us / FAQ / Contact. `site-footer.tsx` already clean (Product: How it Works, Pricing, FAQ / Company: About, Why Choose Us, Testimonials / Legal: Privacy, Terms, Contact) — left as-is.
  * **Dashboard modern:** appended glass/gradient elevation to `src/app/globals.css` + `src/styles/dashboard.css`, added 1px top accent line + hover lift to metrics/panels, modernized `src/app/dashboard/layout.tsx` console accent. Affects all 3 roles (admin `acid` purple, agent `cyan`, publisher `amber` via `--accent-rgb`).
* **Outstanding:** `multi-select publisher in campaigns` (migration 0043 + repo + API + UI) — planned before this auth/nav plan; will resume after plan approval.

---

## 3) Information Architecture — Pages vs Anchors

**Principle you set:** keep pages empty (shell + heading only) for now; don't build content you will replace.

### 3.1 Keep as real empty pages (shell route, no content)
These map to existing `src/app/(public)/*` routes — will be reduced to minimal shell (title + "Content coming soon" + link back to home). No new pages will be created.

| Route | File | Keep empty |
|---|---|---|
| `/about` | `(public)/about/page.tsx` | Yes — empty shell |
| `/contact` | `(public)/contact/page.tsx` | Yes — but keep form shell? Currently has public-lead form → keep as-is (functional) or empty? **→ Ask you** (default: keep form, it's a real capture) |
| `/privacy` | `(public)/privacy/page.tsx` | Yes — empty shell (legal you will provide) |
| `/terms` | `(public)/terms/page.tsx` | Yes — empty shell |
| `/faq` | `(public)/faq/page.tsx` | Yes — empty shell (will be provided) |
| `/testimonials` | `(public)/testimonials/page.tsx` | Yes — empty shell (TestimonialsSection already on home) but keep page for SEO |
| `/why-choose-us` | `(public)/why-choose-us/page.tsx` | Yes — empty shell |
| `/pricing` | `(public)/pricing/page.tsx` | Option: keep empty shell, but pricing also lives in `FeaturesAndPricing.tsx` on home → **anchor preferred, page as empty fallback**. See 3.2 |

### 3.2 Make homepage-anchor only (smooth scroll, no new page)
Add `id` to homepage sections, header/footer links become `/#id` with `scroll-behavior: smooth` + Lenis (already via `bencium` motion spec). This avoids duplicating content.

| Anchor | Homepage section | Component | ID to add |
|---|---|---|---|
| `/#how-it-works` | Process steps | `ProcessSection.tsx` | `id="how-it-works"` |
| `/#features` | Feature grid | `FeaturesAndPricing.tsx` → `.featuresSection` | `id="features"` |
| `/#pricing` | Pricing cards | `FeaturesAndPricing.tsx` → `.pricingSection` | `id="pricing"` |
| `/#testimonials` | Testimonials | `TestimonialsSection.tsx` | `id="testimonials"` (already has?) |
| `/#agent-calls` | Agent call demo | `AgentCallSection.tsx` | optional `id="agent-calls"` |
| `/#dashboard` | Dashboard preview | `DashboardSection.tsx` | optional |

**Nav mapping after anchor decision:**
* Header `How it Works` → `/#how-it-works` (instead of `/how-it-works` page). Keep `/how-it-works` page empty for direct visits/bookmarks, but primary CTA scrolls.
* Header `Pricing` → `/#pricing` (with empty `/pricing` fallback)
* Footer `Why Choose Us` — if you want it as anchor, could map to `/#features` or keep as `/why-choose-us` empty page. **→ Ask you.**

**Question for you (before implementing):**
1. Which of `how-it-works`, `pricing`, `why-choose-us`, `testimonials` should be **anchor-only** vs **empty page**? Proposal: `how-it-works` + `pricing` = anchor + empty-page fallback; `why-choose-us` + `testimonials` = empty pages (keep separate). Confirm or tell me your mapping.
2. `/contact` — keep the current public-lead form functional, or make it empty shell too?

### 3.3 Header/footer final link sets (proposal, after anchor decision)

**HeroV5 header (home, glass pill):** logo `→ /`, links `How it Works (/#how-it-works)`, `Pricing (/#pricing)`, `FAQ (/faq empty)`, `Contact (/contact)`, auth `Log in (/login)`, CTA `Start free trial (/register)`. Removed: Why Us (moves to footer) to keep header at 4 links + auth — cleaner on mobile.

**CoverageFooterCTA (home):** keep 5-col grid (Brand + Product + Company + Resources + Newsletter). Product: `How it Works /#how-it-works`, `Pricing /#pricing`, `Features /#features` (all anchors). Company: `About /about` (empty), `Why Choose Us /why-choose-us` (empty), `Testimonials /#testimonials` (anchor) + fallback page. Resources: `FAQ /faq`, `Privacy /privacy`, `Terms /terms`. Newsletter stays.

**Public `site-header`/`site-footer`:** mirror same links but with absolute paths (`/`, `/#how-it-works`, etc.) so they work from any public page.

---

## 4) Auth 2026 Redesign — Research + Constraints

**Keep:** font `Poppins 500/600/700` (display), `Inter` (sans), `JetBrains Mono` (mono); colors `--ground / --panel / --line / --acid / --cyan / --amber` + `--hp-*` homepage tokens. No new palette beyond subtle tints.

**2026 trends to apply (from `bencium` SKILL.md + `web-interface-guidelines`):**
* **Editorial type-forward** — heading is the hero (tight leading, mixed serif weight), not a centered card with icon.
* **Dark-first near-black + one acid accent** — already our ground; add hairline rules, numbered eyebrow, not glass-everything.
* **Refined depth, not plastic:** layered surfaces with `hairline border + soft shadow + 1px top highlight`, grain/noise texture (subtle), NOT full `backdrop-filter` haze (CSS glass only for nav if needed).
* **Motion as storytelling:** one entrance (GSAP), not a demo reel; respect `prefers-reduced-motion`; focus `transform/opacity` only.
* **From `web-interface-guidelines`:** keyboard-everywhere, visible `:focus-visible`, 16px mobile inputs (prevent iOS zoom), `touch-action: manipulation`, loading button keeps label + spinner, `autocomplete` correct, paste not blocked, toasts via `aria-live`.

**Scope of redesign (files):**
* `src/app/(auth)/layout.tsx` — shell: currently `.auth-shell` radial + `.auth-card`. Replace with split layout: left editorial story (large type, feature bullets, grain) + right card, responsive stacks on mobile. Keep `.auth-shell` but modernize.
* `src/app/(auth)/login/page.tsx` + `register/page.tsx` + `forgot-password/page.tsx` + (also touch `reset-password/page.tsx`, `verify/page.tsx` for consistency)
* `src/styles/auth.css` — rewrite with new tokens, keep variables.

**Design direction (commit):** **Dark editorial + refined depth** (not Brutalist, not warm-cream). Rationale: matches Coverage Calls' existing premium-agency dark (`#12071E`) and avoids generic SaaS blue. One memorable moment per auth page: oversized `Sign in / Create account` with tight tracking + a subtle grain/gradient panel behind the story column.

**Alternatives to discard:**
* Brutally minimal (too stark for conversion),
* Warm tactile (clashes with our violet ground),
* Playful/toy-like (wrong tone for ops console).

**Components to deliver:**
* Story column (numbered eyebrow `01 — ACCESS`, headline, 3 bullets with hairline rules, mini trust bar “Trusted by growing teams”).
* Auth card: hairline + top highlight + soft shadow, 12px radius, 16px input height, focus ring `rgba(var(--accent-rgb), .16)`, primary button `pill 9999px` with `inset highlight`, error/success with mono 11px as now but with refined borders.
* Keeping your font/color — no new fonts.

**Skills usage:**
* `bencium-innovative-ux-designer` → tone/direction + motion spec + avoidance of generic AI aesthetics.
* `web-interface-guidelines` → a11y, form, animation, layout checklists (will audit the redesigned auth pages).

---

## 5) Login Slowness — Audit Plan

**Why it may feel slow (hypotheses to verify, in order):**

1. **Client `authClient.signIn.email` → `better-auth` POST** — no optimistic local cache; better-auth's `/api/auth/sign-in/email` hits DB (Kysely pool `max 20`, pool created per `src/server/auth.ts` without `max` tuning, plus email verification check). Measure TTFB via `browser_network_requests` (playwright) + server logs.
2. **`proxy.ts` (Next middleware)** runs on **every** request via `matcher: "/((?!_next/static|...).*)"` — it reads cookies, sets headers, but does not cache. It's lightweight, but ensure it returns early for `isStaticAsset` (it does) and does not do DB work (it doesn't). Check matcher exclusion for `api/auth`.
3. **No prefetch/optimistic:** login page does `window.location.href = redirect` (hard reload) intentionally so proxy sees fresh `__Secure-` cookie — that's correct per comment, but feels slower than `router.push`. Could add `router.refresh()` + spinner min duration? Already has spinner but no `show-delay`.
4. **Server `auth.ts` Pool:** creates its own `new Pool({ connectionString })` separate from `src/server/db.ts` pool — double pool, cold start. No `max` set (default 10) vs `db.ts` max 20. Could unify or tune.
5. **Email verification path:** if `smtpConfigured()` true, `requireEmailVerification` blocks sign-in until verified — adds a DB check. Verify if `SMTP` is configured in prod vs dev.
6. **No loading skeleton delay:** button shows spinner immediately; `web-interface-guidelines` recommends 150-300ms show-delay + 300ms min visible to avoid flicker, but not slowness.
7. **Network: `better-auth/react` `createAuthClient` `baseURL` from `NEXT_PUBLIC_APP_URL` — if that URL is not local (e.g., `https://coveragecalls.com` in dev), request goes remote.

**Audit steps:**
* `hermes mcp list` already verified `playwright` + `chrome-devtools` enabled → next session run `browser_network_requests` on `POST /api/auth/sign-in/email`, measure latency from nav to redirect.
* Check `chrome-devtools` `performance_start_trace` on login flow, capture `list_console_messages` + `list_network_requests`.
* Read `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` in `.env` vs `.env.local`.
* Profile `auth.ts` pool vs `db.ts` pool — consider sharing pool.
* Verify `proxy.ts` matcher excludes `/api/auth/*` correctly (currently `publicPaths` includes `/api/auth` but matcher still runs; it just early-returns `NextResponse.next()` for auth paths — fine, but measure overhead).

**Proposed optimizations (implement after audit, keep behavior):**
* Share single `pg` Pool between `auth.ts` and `db.ts` (import `pool` from `db.ts` instead of `new Pool`).
* Add `matcher` exclusions for `api/auth` and health to skip proxy entirely.
* Add client-side `show-delay` + `minimum loading` (~350ms) so perceived performance is stable, not faster but less janky.
* Pre-warm `/dashboard` data via `prefetch` after sign-in success before hard reload? Or keep hard reload but add optimistic toast immediately (already does).
* If `BETTER_AUTH_URL` points remote in dev, align to localhost.

---

## 6) Execution Plan

### Phase 0 — Confirm with you (this plan)
* You approve anchor vs page mapping (Q1, Q2 above) + confirm `contact` form stays.
* You confirm auth redesign direction **Dark editorial + refined depth** keeping fonts/colors, or pick another tone from bencium list.

### Phase 1 — Nav (empty pages + anchors) — no content build
1. Add `id` anchors to homepage sections (`ProcessSection`, `FeaturesAndPricing` x2, `TestimonialsSection`, etc.).
2. Update `HeroV5.tsx` header links to `/#how-it-works`, `/#pricing`, etc. per approved map; `site-header.tsx` likewise.
3. Trim new public pages to empty shells (keep only `<h1>` + “Content coming soon — back to home” + link). Files: `src/app/(public)/*/page.tsx` (about, pricing, why-choose-us, testimonials, faq, privacy, terms). Keep `contact` form if approved.
4. Update `CoverageFooterCTA.tsx` + `site-footer.tsx` link sets per 3.3.
5. Verify `scroll-behavior: smooth` + Lenis works; add `prefers-reduced-motion` guard.
6. `graphify update .` + `npm run typecheck` + `npm test`.

### Phase 2 — Auth 2026 Redesign
1. Rewrite `src/styles/auth.css` with editorial split, grain, hairlines, mono eyebrow.
2. Rewrite `src/app/(auth)/layout.tsx` to two-col (story + card) with responsive fallback.
3. Rewrite `login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx` (+ `reset-password`, `verify`) to match new card, correct `autocomplete`, `input` 16px mobile, `password-toggle` a11y, `aria-live` for errors, `prefers-reduced-motion` GSAP.
4. Audit with `/web-interface-guidelines` checklist (keyboard, focus, paste, loading, deep-link).
5. Visual test via `playwright: browser_snapshot + browser_take_screenshot` + `chrome-devtools: take_screenshot` at 375, 768, 1280.
6. `graphify update .` + `npm run build` (check no new TODO).

### Phase 3 — Login Speed Audit + Fix
1. Trace login with `playwright` + `chrome-devtools` performance traces (measure before/after).
2. Fix pool sharing, proxy matcher, baseURL alignment, loading timing per findings.
3. Re-measure, report delta.

### Phase 4 — Resume pending: multi-select publisher in campaigns
* After auth/nav lands, resume `0043_campaign_publishers` migration + repo + API + UI (new campaign + detail page multi-select) — already specced in earlier thread.

---

## 7) Token / Graphify / Memory Discipline (your global rules)

* Every structural change → `graphify update .` → read `graphify-out/GRAPH_REPORT.md` + `graphify query "…" / path / explain` instead of broad `grep -R`.
* Keep `docs/PROGRESS.md` last-30-lines + `ROADMAP.md` first incomplete phase at session start; append 5-7 lines to `docs/PROGRESS.md` at session end (date, agent, phase/task, shipped, decisions, broke/TODO, next + typecheck/test).
* Procedures that are task-type reusable → save via `skill_manage` (skill, not memory). Memory only for cross-session facts (who user is, standing conventions).
* Do not invent page content — pages stay empty until you provide content/components.
* Use latest `bencium` + `web-interface-guidelines` checklists; research API docs before integration (here: `better-auth` latest, Next.js proxy).

---

## 8) Questions for you before coding

1. **Anchor vs page map:** approve the proposal in 3.2 (which links are anchors)? Default: `how-it-works` + `pricing` = anchors (+ empty page fallback); `why-choose-us` + `testimonials` = empty pages. Change?
2. **Contact page:** keep the public-lead form functional, or make it empty shell too?
3. **Auth direction:** confirm **Dark editorial + refined depth** (keeps Poppins + violet ground) or want a different bencium tone (e.g., Brutally minimal, Luxury/refined)?
4. **Auth scope:** redesign `reset-password` + `verify` as well for consistency, or only the 3 you listed?
5. **Proceed with Phase 1 now** after you answer, or also green-light jumping straight to Phase 2 (auth) in parallel?

*If I have doubt on any of the above I will ask — not guess — per your rule.*
