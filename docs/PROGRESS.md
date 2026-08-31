# PROGRESS.md — Living Memory (GDS call-center)

> **MANDATORY FOR EVERY AGENT (Hermes / OpenCode / Claude / Cursor):** Read last 30 lines at session START. Append 5-7 lines at session END. This is how workers stay fresh without `session_search`. `ROADMAP.md` is the queue, this file is the log.

## How To Use
- **START:** `read_file` this file (last entry) + `ROADMAP.md` first `[ ]` / next incomplete PHASE
- **END:** Append new entry below (Date, Agent, Phase/Task, What shipped, Decisions, What broke, Next). Never delete old entries.
- **FRESHNESS:** If you need older sessions, run `session_search("GDS call-center")` or check `graphify-out/`

---
## 2026-08-27 16:40 - SYSTEM - INIT Living Memory
- Created `docs/PROGRESS.md` (missing before) + patched `AGENTS.md` with Living Memory section. Zero deletion — `ROADMAP.md` + `PHASE_PLAN.md` preserved.
- Baseline from `ROADMAP.md`: Phases 1-5+7 of DEVELOPMENT_LIFECYCLE done. ROADMAP PHASE 0 (Security Blockers 0.1-0.12) COMPLETE 2026-08-24 (317 tests). PHASE 1 (Money Correctness 1.1-1.6) COMPLETE 2026-08-24 (321 tests). PHASE 1.5 (Call Connect Latency 1.5.1-1.5.7) COMPLETE code side 2026-08-24 (321 tests, webhook 1.3-1.6s, target <3s). PHASE 2 (Feature Completion 2.1-2.17) 17/17 COMPLETE 2026-08-25 (323 tests). PHASE 3 (Hardening) COMPLETE 2026-08-25 (328 tests).
- Migrations: 0028-0034 verified live (355 NPAs, indexes). Pending: `0021_retreaver.sql` must be applied before Retreaver deploy per PHASE_PLAN.
- Recent Hermes sessions: 20260827_002001_a7b4d9 (Deep scan backend/logic, excluded homepage) + 20260827_145648_8c0c89 (design-worker Google Vision + odiff + .design-work migration). OpenCode design-worker homepage session was noted as running in parallel (separate from Hermes).
- Known gap: `.git` is empty dir — repo NOT under version control on this machine (ROADMAP.md:288 warns). Fix before next feature.
- Pending pages per ROADMAP.md: Admin /admin/support, /admin/revenue, /admin/cms, sub-admin views; Agent /support, wallet Stripe checkout; Publisher /payouts, /settings, recording playback.
- Next worker should: Pick next incomplete item from `ROADMAP.md` PHASE 2/3 pending pages or Retreaver Phase 5 (campaign `rtb_postback_key_encrypted` + publisher portal). DO NOT touch `src/app/page.tsx` / `src/components/homepage/*` / `src/styles/homepage.css` / `.design-work/DESIGN.md` if design-worker is active — backend/logic only.

---
<!-- APPEND NEW ENTRIES BELOW — DO NOT EDIT ABOVE -->

## YYYY-MM-DD HH:MM - Agent Name - PHASE X.X
- Did:
- Decisions:
- Broke / TODO:
- Next:
- Tests: `npm run typecheck` / `npm test` result:

## 2026-08-27 16:52 - SYSTEM - SECTION_PLAN gated workflow
- Created .design-work/SECTION_PLAN.md (7 sections, gated: one worker dispatch per section, user approve before next)
- Root audit: CLEAN — no stray *.png/*.txt/DESIGN.md in project root. .design-work is sole artifact folder per .gitignore.
- Cleaned stale: removed placeholder .design-work/DESIGN.md (STALE 9 lines, Sources: full-*.png) — will be re-created on S1 Hero PASS 0 at 1440px. Cleared screenshots/drafts/trash. Renamed refs 1..6.png -> hero/trustbar/howitworks/browser/analytics/features.png + homepage.png kept (13 files total, 7 original + 6 semantic copies).
- Gating: PM/design-worker may only dispatch S(n+1) after user writes "approve S(n)" or checks [x] in SECTION_PLAN.md. No auto-chain.
- Next: Dispatch S1 Hero via @design-worker with prompt in SECTION_PLAN.md. Reuse DESIGN.md after S1.

## 2026-08-27 19:05 - Hermes design-worker - S1 Hero
- Did: PASS 0 re-extracted .design-work/DESIGN.md at 1440px (Sources: hero.png | Measured: 2026-08-27 @1440px, 1442×662, 15KB, 14 sections: canvas/tokens/layout/ambient/typography/CTAs/S-curve/call-card/agent-card/motion/breakpoints/a11y/map/QA). PASS 1 implemented src/components/homepage/Hero.tsx (DESIGN.md:96,112 refs + GSAP timeline) + src/app/homepage.css Hero block (DESIGN.md:36-46 layout, 48-70 ambient, 72-102 type/CTAs, 104-166 cards) — tokens synced with tokens.css. PASS 2 3-pass loop at 1440/768/375: .design-work/screenshots/hero-1440-p3.png (1440×662), hero-768-p3.png (768×900), hero-375-p3.png (375×812) + hero-1440-diff-p3.png.
- Scores: 1440 vs refs/hero.png odiff --threshold 0.1 --antialiasing = **17.50% (167042 px diff, gate ≤5% NOT met)**; 768 vs hero.png 54.93%, 375 vs hero.png 51.16% (responsive stacked, expected). Region breakdown after tuning: copy 20.94% (was 32.99%), card 15.76% (was 47.63%), orb 24.91% (was 75.29%) — orb opacity 0.82→0.58, grid 0.34→0.1, trust margin 20→16, padding 108→108, Poppins font added to layout.tsx.
- Decisions: Viewport-height=hero-height (100svh) so 1440 capture must be 1440×662 to match ref 1442×662; 900h viewport gave 42% diff. HID tests: no-orb 14.85% (orb alone +8%), no-all-ambient 14.78%. Tuned desktop calibration block but floor remains ~14.8% even without orb — indicates headline gradient/CTA positioning still off by 11px (headline) / 20px (trust) vertical; threshold 0.3 still 7.11% (>5). Will need further headline line-height / inner gap / card shadow tuning.
- Broke / TODO: Gate ≤5% not achieved (17.5% vs 5%). Vision API 401 prevented AI visual verification, used programmatic odiff + Python region/pixel sampling instead. Next fix: re-measure headline at 1.04 line-height + increase hero-sub/actions gaps + re-tune call-card S-curve to shave ~12 points. Keep .design-work clean (6 screenshots: 3 hero + 3 diffs). Do NOT start S2 until approve S1 per SECTION_PLAN.md gating.
- Next: Await user `approve S1` or `fix S1: ... per DESIGN.md:line`. On approve, dispatch S2 TrustBar reusing DESIGN.md (do NOT re-extract).
- Tests: `npm run typecheck --prefix call-center` clean; `npm test` 396 passed (5 skipped) 18.2s, same as baseline. Dev server http://localhost:30001 alive (PID 13956).

