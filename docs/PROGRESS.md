
## 2026-09-07 14:36 - test-worker (via Hermes) - LIVE_TEST - 14/14 pass on https://coveragecalls.com - saved to docs/LIVE_TEST_2026-09-04.md - next: optional close /revenue + /admin/cms to 401

## 2026-08-31 18:30 - Hermes backend - PHASE 5 complete (10/10 pending dashboards)
- Did: Phase 5.1 Support Tickets (API + agent/admin pages + 5 vitest tests) → Phase 5.2 Finance (wallet Stripe checkout UI already in wallet/agent/page.tsx + admin/revenue + publisher/payouts + 3 tests) → Phase 5.3 Content & Publishers (publisherNav Scripts/Tutorials wired + dispositions summary card + agency scope fix verified + 5 tests). git init + first commit `8617c61` (1157 files). graphify update . → 1010 nodes, 963 edges, 285 communities.
- Decisions: Subagent `deleg_3301e8de` hit max_iterations + 429 on file path resolution — did Phase 5.1 directly via patch+write (5 tests in support.test.ts). Subagent `deleg_7c494096` same failure on .hermes/plans/ path — did Phase 5.2 directly (3 tests in revenue.test.ts). Phase 5.3 fully direct (5 tests in dispositions-summary.test.ts).
- Broke / TODO: Homepage CMS-driven sections (Phase 2.6 public) still owned by design-worker. Sub-admin scoped views (Phase 2.7) not requested yet.
- Next: Pre-deploy verification (ngrok + manual A-Z). Then VPS deploy per ROADMAP/Dockerfile + docker-compose 4 services.
- Tests: `npx tsc --noEmit` 0 · `npm test` 409 passed | 5 skipped (35 files) · `npm run build` 148 routes clean · git `8617c61` committed.

2026-09-04 - reviewer - DEEP_REVIEW - PASS WITH NOTES on 5 areas - saved to docs/REVIEW_2026-09-04.md - next: address fails

## 2026-09-04 - worker - DEEP_SCAN
- Did: 5-area audit (RBAC matrix 113 routes + 177 methods · cron/worker money jobs · money-path trace mock/webhook→orchestrator→finalize→fees→wallet · soft-delete safety · migrations 0001-0038) → saved to docs/AUDIT_DEEP_2026-09-04.md (515 lines, file:line refs).
- Decisions: counted routes via both `export function` and `export const` patterns (Next.js App Router). Scoped "missing apiHandler guard" narrowly — auth:false + publicApiHandler + health are intentional. Treated as severity: HIGH = broken at runtime in prod; MEDIUM = deploy risk / partial-failure; LOW = cosmetic.
- Broke / TODO: 3 HIGH findings — softDelete column missing on agents/campaigns/agencies/scripts/tutorials/calls (no `deleted_at` → SQL error when delete-button clicked; no tests cover this path). 2 MEDIUM — 24 `CREATE INDEX` on already-populated tables lack `CONCURRENTLY` (locks writes on deploy); `0028_provider_agent_call_id.sql` collides with `0028_ping_first.sql` (filename ambiguity). 3 LOW — 83 ALTER TABLE without IF EXISTS, Date.now() in idempotency_key, health endpoint unwrapped. RBAC matrix is clean (no fall-throughs, no cross-tenant agencyId leaks).
- Next: ship migration `0039_soft_delete_columns.sql` adding deleted_at to the 6 broken business tables — single HIGH blocker. Then convert post-0001 CREATE INDEX to CONCURRENTLY for safe prod deploy. Then address filename collision at 0028. Then defensive idempotency on agentSubscriptions.incrementCallsUsed.
- Tests: `npx tsc --noEmit` not re-run (audit only) · no new code shipped · git not modified except this entry.

## 2026-09-07 - test-worker - FEATURE_TESTS - 73/85 on local+live (16 sections A-O) - saved to docs/FEATURE_TESTS_2026-09-07.md - HIGH regressions: (1) DELETE scripts/tutorials 500 (missing deleted_at — confirms 2026-09-04 audit finding) (2) POST /api/v1/public/leads always 500 (app.leads.agency_id NOT NULL but route inserts NULL — NEW outage) - next: triage + ship migrations 0039/0040

## 2026-09-09 14:40 - Hermes (main) - PLAN_AUTH_NAV_MODERN + MULTI-PUBLISHER
- Did: Phase1 Nav anchors (ids: how-it-works, features, pricing, testimonials + 9 public shells empty) + Phase2 Auth 2026 redesign delegated (auth.css split editorial/card, 5 pages, a11y, 16px mobile) + Phase3 login speed (share pool db.ts→auth.ts, proxy matcher skips api/auth/health) + Phase4 multi-publisher (0043_campaign_publishers migration + campaigns.get/setPublisherIds + validate publisher_ids + POST/PATCH/publishers PUT + UI multi-checkbox in new/[id]).
- Decisions: Header now 4 anchors + About, footer Product anchors, company/Resources split; homepage sections use homepage violet tokens for auth story; keep single publisher_id legacy col synced to first join row for backward compat; proxy matcher excludes api/auth to cut middleware overhead.
- Broke / TODO: None blocking. Next session playwright/chrome-devtools MCPs available (24+29 tools) for visual regression — test auth at 375/768/1280 + anchor scroll.
- Tests: tsc --skipLibCheck 0 · vitest 409 pass | 5 skipped (35 files) · build 148 routes clean · graphify 1077 nodes 1045 edges.

## 2026-09-09 15:45 - Hermes (delegated x3) - CLIENT_FEEDBACK_PLUS_2026-09-09
- Did: Charts bento (admin/agent/publisher mini-pie/line/bar/donut via recharts, 140-180px, per-role accent, reduced-motion) + Campaign UX (new 2-step + [id] tabbed ?tab= + publishers multi-checkbox 0043) + Feedback #1 multi-pubs done, #2 remove Request Payout (wallet tabs), #3 calendar empty CTA, #4 Subscriptions grouped next to Wallet (nav BILLING box), #5 scripts chips [Your Name] etc + live preview + empty CTA, #6 50-state picker (validate updateOwnAgentSchema + take-calls/settings/[id]), #7 export csv/xlsx blob + 400 on json, #8 agent-scoped recentCalls via /me agentId.
- Decisions: Keep 50 states + DC in lib/us-states.ts; keep legacy publisher_id synced to first join row; keep homepage shells empty; use 2026 bento glass 12px radius, hairline top highlight.
- Broke / TODO: None. Next: visual regression via playwright/chrome-devtools at 375/768/1280 once you reload.
- Tests: tsc --skipLibCheck 0 · vitest 409 pass | 5 skipped (35 files) · build 148 routes · graphify 1093 nodes 1064 edges.

2026-09-11 00:48 - worker - FIX_EXPORT+AGENT_CAMPAIGNS+RTB_AUTO - did fix export + agent campaigns browse/join + RTB auto key (9 files) tsc:0 next:manual QA

## 2026-09-14 - assistant - FULL_PLAN - marketplace P1 + CMS/tutorials last - wrote docs/plans/RTB_MARKETPLACE_AND_CMS_PLAN.md (P1.1-P1.5 + P2.1-P2.2) + ROADMAP Phase 6/7 - next: start P1.1 on approval - tsc:untouched (plan only)

## 2026-09-14 - assistant - P1.1 DONE - marketplace pricing/payout/visibility: migration 0044 + campaigns.ts Row/create/findManyWithBid (effective payout falls back to max payout) + validate create/update schemas + bid route unchanged (payout already supported) + admin [id] Bidding tab max-payout + visibility controls + scripts/seed-marketplace-offers.mjs (4 client offers) + marketplace-pricing.test.ts 4/4 - tsc:0 - graphify: skipped (no CLI in env) - next: P1.2 agent live-for-campaign

## 2026-09-15 - assistant - P1.2 CLOSE-OUT (ping live-gate) - ping-evaluator.ts agent query now gates is_live=true for THIS campaign with legacy-open fallback (NOT EXISTS selections = open, single query, index-friendly) + header comment updated - tests: ping-evaluator.test.ts +2 (SQL has live gate + campaign_id param, no-live -> no_agent_available) + call-orchestrator.test.ts +3 with agentCampaignSelections mock (live-only select, empty-live -> missed+cancel, null -> legacy open) - tsc:0 - vitest: 418 pass | 5 skipped (36 files) - next: P1.3 eligibility.ts + POST /api/v1/rtb/reserve

## 2026-09-15 - assistant - P1.2 VERIFIED COMPLETE + P1.3 DONE (pre-selection eligibility) - P1.2 DoD: 0045 migration + POST /live + GET is_live_for_me/pricing + Take Calls gate + routeCall filter + ping gate + tsc:0 + tests green, no TODOs - P1.3: ping-evaluator.ts extracted findRoutableAgentId (shared gate, behavior-preserving refactor) + NEW eligibility.ts getEligibleOffers (publisher validation 404/422, NPA state, payout range, margin guard, state match, per-offer routable-agent check, platform-wide pool, self-excluded, no bid loop) + validate.ts reserveRtbSchema + POST /api/v1/rtb/reserve (publishers:manage like sibling route, empty -> 200 no-target never calls Retreaver, else ONE reserveRtbReservation -> 201) + eligibility.test.ts 12/12 (A/B/C range, negative margin, bid-override wins, TX/FL, NPA, anonymous, deplete, pure-read, pub validation) + route.test.ts 4/4 (guard, no-target, one-reserve, 422) - no cross-offer round-robin code exists (round_robin is per-campaign agent ordering, kept) - tsc:0 - vitest: 434 pass | 5 skipped (38 files) - build clean with /api/v1/rtb/reserve - next: P1.4 dual wallets

## 2026-09-15 - assistant - P1.4 DONE (dual wallets) - migration 0046 agency_wallets(balance_cents,enabled)+allocations(unique agency/agent, CHECK>=0, pool starts 0 never minted) + agency-wallets.ts repo (getPool get-or-create, setPoolEnabled, creditPool, setAllocation upsert, sumAllocated, allocationForAgent, effectiveBalanceSql fragment gating allocation on pool flag) + wallet-entries.sumEffectiveByAgent + agencies.agency_wallet_enabled + shared fragment swapped into ping findRoutableAgentId (+ignoreBusy opt for sync) / routeCall eligibilityRows / eligibility via shared gate (tier-1 logic unchanged) + APIs GET/POST/PATCH /api/v1/agency/wallet + PUT allocations (all agency:manage head-only, allocation cap<=pool 422, agent agency-scoped 404, Stripe pool checkout metadata agency_wallet_topup, no credit on create) + webhook agency_wallet_topup branch (payments guard + ledger top_up stripe_session + creditPool + best-effort sync) + retreaver.setCampaignPaused adapter + offer-wallet-sync.ts (30s pg-boss queue env-gated, change-only PUTs, busy-ignored predicate, unconfigured still evaluates) + UI pool page + BILLING nav Pool Wallet (agency role) + agent wallet personal/allocated/effective split - tests: agency-wallets 8/8 + sync 8/8 + agency routes 6/6 + webhook pool 3/3 + ping/orchestrator effective-balance assertions - tsc:0 - vitest: 461 pass | 5 skipped (42 files) - build clean (+/api/v1/agency/wallet /allocations, /dashboard/wallet/pool) - next: P1.5 billing + verification

## 2026-09-15 - assistant - P1.5 DONE (billing + verification, marketplace COMPLETE) - finalizeCall records winning effective bid/payout/margin (override wins, strict nulls) merged into qualification_snapshot inside invoice-winner branch + finalize_marketplace JSON log, reporting-only invoice totals untouched, short calls explicit zeros, disposition nulls - migration 0047 rtb_reservations.client_key unique + findByClientKey/setClientKey + /rtb/reserve idempotency_key (redelivery deduped, no-targets not stamped) - wrote docs/plans/P1_5_ACCEPTANCE.md (17 items mapped to code+tests, seeds verified $16/$10 $35/$20 $50/$35 $65/$50, out-of-scope noted) - tests: finalize marketplace 6/6 + reserve idempotency 3/3 - tsc:0 - vitest: 470 pass | 5 skipped (42 files) - build clean - next: client UAT on marketplace, then Phase 7 CMS (on hold)

## 2026-09-15 - assistant - PRICE SHEET (real client data) - defaults map 1:1 (FE $50/30s $70/90s, Medicare $16/30s $35/120s), corrected FE Long default $65->$70 in seed (safe one-time UPDATE, admin edits untouched) + added 5 exclusive seeds (draft/unassigned, payouts NULL for Bidding tab) - gaps closed: routeCall exclusive-requires-assignment (never open, even with zero rows) + eligibility excludes exclusives from open pool - tests: +2 (routeCall never-open, eligibility query exclusion) - tsc:0 - vitest: 472 pass | 5 skipped (42 files) - acceptance doc item 18 - next: client UAT

## 2026-09-15 - assistant - PHASE 7 DONE (P2.1 creatives + P2.2 tutorials) - choices locked: global creatives visible to all, hero = carousel of 3 - P2.1: migration 0048 campaign_creatives + repo (live-window SQL, global-vs-assigned feed) + validate schemas + POST /api/v1/cms/upload (Supabase storage lazy, 5MB img/50MB video, 503 paste-URL fallback, keys in .env.example) + GET /api/v1/cms/creatives (calls:view agent feed, assigned campaigns via findCampaignIdsForAgencyOrAgent) + admin CRUD /api/v1/cms/admin/creatives (cms:manage, same-agency campaign links) + AdminCms Campaign Ads tab (table + modal: campaign select, upload-or-URL, CTA, hero/feed, priority, schedule) + agent dashboard AgentHero carousel + AgentFeed below Quick Actions - P2.2: migration 0049 tutorials thumbnail/order/published/required + tutorial_progress PK pair + repo (findPublished, progress join single query, recordProgress 90% flip monotonic) + GET tutorials role split (manage=all, agent=published+progress) + PATCH/GET /api/v1/tutorials/[id]/progress (session user only) + new/detail admin fields (thumbnail/order/published/required + manager edit mode) + agent list rewrite (pills, thumbnails, required/completed badges, progress bars, video modal with throttled timeupdate PATCH) - tests: creatives 4+3+5+4, tutorials 4+2+4 (26 new) - tsc:0 - vitest: 498 pass | 5 skipped (49 files) - build clean (+cms/creatives /upload /admin/creatives, tutorials/[id]/progress) - next: client UAT full marketplace + CMS

## 2026-09-15 - assistant - FULL VERIFY (all sessions to date) - tsc:0 - vitest: 498 pass | 5 skipped (49 files, skips = Telnyx live only) - build clean, all 8 new API routes present, zero errors - audit: migrations 0044-0049 sequential no collisions, exclusive gates + marketplace log confirmed in final code, PROGRESS chain intact P1.1-P2.2 - note: tree has pre-existing uncommitted changes outside my scope (landing pages, assorted admin pages, proxy.ts, 0043 edit) - nothing committed (not requested) - next: client UAT

## 2026-09-15 - assistant - MIGRATIONS APPLIED (live DB) - 0042 needed surgery: runner wraps in transaction (CONCURRENTLY forbids it) so applied via autocommit script; file had 3 dead statements (assignments.publisher_id, retreaver company_id/received_at — columns never existed) removed with notes; 0042 rewritten to 5 net-new indexes after pg_indexes/information_schema audit (rest were name-collision no-ops or shape duplicates of 0010/0019/0029) - then runner applied 0044-0049 clean - seed created 9/9 campaigns, verified live: defaults $16/30s $35/120s $50/30s $70/90s draft + 5 exclusives draft/unassigned/payout-NULL - versions recorded 0042,0044-0049 - NOTE: some duplicate-shape indexes pre-exist + a few landed from the first 0042 attempt (perf_* vs idx_*); harmless, recommend future unused-index sweep via pg_stat_user_indexes before any drop - next: client UAT

 ## 2026-09-16 - assistant - NEW-LOGIC TESTS (tutorials + CMS + publisher/campaigns) - fixed real bug: POST /api/v1/tutorials dropped thumbnail_url/order_index/published/required the UI sends (new page + detail edit both send them) + [id] PATCH passed raw body (agency_id mass-assignment) — added createTutorialSchema/updateTutorialSchema in validate.ts, wired into both routes, widened tutorials.update to accept nullable video_url/duration_seconds for clears - tests: 9 new files, 59 new tests, all real (query-level SQL asserts + route-level handler asserts): campaign-publishers 6/6 (dedup/legacy-sync/clear/union-join/effective-fields/sort-allowlist), tutorials-extended 6/6 (reset-overwrite/negative-clamp/89v90/progressFor-scope/findByAgency-scope/deleted-filter), creatives-feed 7/7 (window-clause/alias/no-placement/param-order/priority/partial-update/mass-assign-guard), validate-new-logic 13/13 (tutorial defaults+rejects/progress-bounds/creative-bounds/reserve-uppercase/allocation/campaign-publisher-ids/publisher-bounds), eligibility-extra 4/4 (below-min/override-wins/explicit-state-beats-NPA/buffer-fallback), tutorials-crud 7/7 (POST-forwards/422/category-filter/PATCH-whitelist/422/scope/soft-delete), campaign-publishers-route 7/7 (GET-scope/PUT-replace/PUT-clear+422/PATCH-branches x4), admin-creatives-patch 6/6 (400/422/cross-agency-404/not-found/success/DELETE-400), cms-upload-limits 3/3 (empty/video-50MB/image-5MB) - tsc:0 - vitest: 557 pass | 5 skipped (58 files, skips = Telnyx live only) - build clean, zero errors - nothing committed (not requested) - next: client UAT

## 2026-09-17 - assistant + design-worker - 10-POINT FIX BATCH (UI + nav + CMS) - direct: Tutorials added to admin OPERATIONS nav (was agent/publisher-only; page itself is role-aware, managers see drafts) + removed creatives/banner/banners from CMS Sections UI (RETIRED_CMS_SLUGS filter, editor branches + seeds + hints removed, DB rows kept not deleted, Campaign Ads tab is the replacement) - worker: NEW shared Modal portal (fixes cut-off root cause: .dashboard-page animation leaves transform != none, becoming containing block for in-flow fixed overlays) adopted by admin-creatives/tutorials-video/agent-verticals/plan/phone-number modals + sidebar collapse (64px rail, 220ms, localStorage cc-sidebar-collapsed, aria-expanded, all 3 navs) + plans + phone-numbers inline forms converted to popups (only 2 showForm instances existed) + global thin violet scrollbars in dashboard.css (webkit 8px + firefox fallback, incl. data-table scrollers) - tsc:0 - vitest: 557 pass | 5 skipped (58 files) - visual QA at 375/768/1280 still needed (no browser tooling in worker env) - nothing committed - next: serialized display IDs decision (item 3) + resume testing Phase A step 3

## 2026-09-17 - assistant - SERIALIZED IDS + AUTO-NOTIFICATIONS SHIPPED - 0050_display_codes applied live (50/50 recorded): AC agencies, CA campaigns, CL calls, PB publishers, IN invoices (new UNIQUE cols + seqs + created_at-ordered backfill + LPAD-4 defaults), agents CC<n> -> AG-NNNN preserving numbers (2 live fixes during apply: calls has no created_at -> ORDER BY started_at, agents has no created_at -> ORDER BY id) - repos: only agents.ts needed a code change (AG- LPAD SQL); other creates omit the column so DB defaults fire; display_code added to 5 Row interfaces + shown in calls/agents/campaigns/agencies/publishers lists - auto-notifications: support reply POST now writes support.reply inbox row (agency-scoped, role-labeled author, never throws) + lead PATCH notifies lead.assigned exactly on assignee change (read-before-write only when assignment requested) + support.reply badge color added - tests: display-codes 5/5 + reply-notify 3/3 + assign-notify 3/3 (11 new) - tsc:0 - vitest: 568 pass | 5 skipped (61 files) - live verified: AC-0001/2, CA-0001..5, CL-0001..4, PB-0001..3, IN-0001, AG-0002/3 - nothing committed - next: resume testing Phase A step 3

## 2026-09-17 - assistant - PHONE NUMBER UNASSIGN + PUBLISHER PROVISION ANSWER - 0051 applied live (51/51): phone_numbers.campaign_id now nullable (spare-pool inventory); unassigned DIDs can never route (ping JOIN misses -> unknown_campaign, deploy reads findByCampaign) + hardened orchestrator DID fallbacks with AND campaign_id IS NOT NULL so a spare never hijacks inbound - NEW PATCH /api/v1/phone-numbers/[id] (same-agency move, null parks as spare, 404s scoped, 422 invalid) + settings page Campaign column now shows name + CA-code + short id (Unknown-campaign badge if the campaign isn't in your agency list) with per-row move dropdown incl. Unassigned (spare) - tests: phone-numbers/[id] 5/5 - tsc:0 - vitest: 573 pass | 5 skipped (62 files) - nothing committed - next: resume testing

## 2026-09-17 - assistant - SUSPEND AUTO-OFFLINE SHIPPED - agents.update override forces availability=offline in the same write whenever approval_status -> suspended/rejected (all admin suspend paths flow through it: Agents list + detail page PATCH; updateApproval/updateAvailability helpers rerouted through it); approve + plain availability edits untouched - routing stops on the very next ping with zero client action; UI shows Offline on refresh - tests: agents-suspend 4/4 (suspend forces offline SQL, reject via helper, approve untouched, availability passthrough) - tsc:0 - vitest: 577 pass | 5 skipped (63 files) - nothing committed - next: full manual test flow

## 2026-09-18 - assistant - EMAIL FIXES (invite button + branding) - root causes: (1) CTA padding lived on the <a>, which several Gmail render paths ignore -> shrunk pill + overflowing text; padding now on the <td> (anchor is text-only), mso fallback kept; (2) reply-to surfaced legacy Relayline addr from EMAIL_FROM under Gmail-SMTP mismatch rewrite; new EMAIL_REPLY_TO env controls reply-to explicitly; (3) card widened 600 -> 680px; .env.example documents EMAIL_FROM/REPLY_TO + Gmail-vs-domain-SMTP guidance - note: user's screenshot email predates the template (no copy-link box) -> stale dev server, restart required - tests: email-templates 10/10 (+2 new: 680px width, td-padding/no-anchor-padding) - tsc:0 - nothing committed - next: user restarts dev, sets env, resends invite

## 2026-09-18 - assistant - HIDE PUBLISHER COMMISSION (dead field) - verified commission_pct is stored but read by zero billing paths (payout = campaign max; live cuts are sub-agency commission_rate + wallet commission entries) - removed Commission % input (POST hardcodes 0), table column, sort branch, state; reworded fixed-price hints (empty = campaign max payout) - API/DB untouched (column stays for the future platform-cut formula) - tsc:0 - vitest: 579 pass | 5 skipped (63 files) - nothing committed - next: user continues Phase 3 testing

## 2026-09-18 - assistant - TEST-FLOW DOC + CLEANUP + SIDEBAR ICONS + TAKE-CALLS LAYOUT - wrote docs/MANUAL_TEST_FLOW.md (full production flow in simple words, all corrections folded in: dev starts all 3 processes, commission hidden, suspend auto-offline, real-key RTB path, India calling) - deleted docs/MANUAL_TEST_FLOW_2026-09-09.md (superseded) + playwright-a11y.test.ts (stale: wrong port + old homepage copy) - rewrote docs/README.md index (old one referenced 6 nonexistent files) - sidebar: favicon mark shows on collapsed rail (full logo expanded) + lucide icons for every nav link (expanded icon+label, collapsed icon-only rail, active-state tint, titles preserved) - take-calls: Recent Calls moved into right column under Licensed States (moved 2 closers instead of 145-line copy), .tc-grid 1.55fr 0.85fr -> 1.55fr 1fr, Live Campaigns 400px cap untouched - tsc:0 - vitest: 579 pass | 5 skipped (63 files) - nothing committed - next: visual check of rail icons + take-calls at 1280/375

## 2026-09-18 - assistant - RTB AUTO-CREATE REMOVED + CAMPAIGN 2-COL + GHL CALENDAR - deleted Auto Create button + dead rtb-key route (production keeps manual paste of Retreaver-issued keys only; cleared stale .next types) - campaign page: new .camp-grid (1.55fr 1fr, collapses at 1024px) on General (General card left; Endpoints + Danger Zone right; Consent Policy card removed as read-only dead weight), Assignments (main card left; Required Skills split into own right-column card + Endpoints; Consent removed), RTB (bidding left, numbers right); Publishers/Bidding left single-column (compact forms) - admin Calendar: new Client Booking tab embedding the client GoHighLevel widget (iframe + lazy script, ID in one const; internal slots/bookings untouched under Onboarding Slots tab) - tsc:0 - vitest: 579 pass | 5 skipped (63 files) - nothing committed - next: visual check campaign tabs + GHL embed with network

## 2026-09-19 - assistant - YT TUTORIALS + DYNAMIC HOMEPAGE PRICING SHIPPED - new src/lib/video.ts (watch/shorts/live/embed parsing, nocookie embeds, artwork fallback) used by tutorial list modal (YT iframe + Mark complete, direct files keep timeupdate) + detail page player + card thumbnails (explicit thumb wins, else YT artwork) - admin Plans popup gains feature-points textarea (one per line, stored {list}) flowing through existing API schemas untouched - NEW public GET /api/v1/public/plans (no auth, earliest agency's active plans cheapest-first, public fields only) feeding homepage Start-small-Scale-big cards with identical classes (middle card highlighted + MOST POPULAR, desc auto from billing/allowance, CTA now links /register, hardcoded fallback when empty) - testimonials verified already CMS-driven (public /api/v1/cms + shape match, hardcoded fallback) — no change needed - tests: video 5/5 + public-plans 3/3 - tsc:0 - vitest: 591 pass | 5 skipped (66 files) - nothing committed - next: user tests YT link + edits plan features, checks homepage

## 2026-09-18 - assistant - CAMPAIGN REQUIRED-SKILLS PICKER (verticals made usable) - the skill gate existed in routing + API but zero dashboard UI set campaign required_skills, so verticals could never filter in production - added Required Skills badge-picker to campaign Assignments tab (useSkills source, per-click PATCH via existing update() + server assertValidSkills, empty = no filter) - tsc:0 - nothing committed - next: user sets medicare/final_expense on the 9 campaigns per flow

## 2026-09-17 - worker - UI-4 (modal cut-off + sidebar collapse + plan/phone popups + thin scrollbars)
- Did: (1) root-caused cut-off modal: .dashboard-page dashIn animation fill both leaves transform translateY(0) (non-none) so page is a containing block for in-flow position:fixed, plus card:hover transforms + backdrop-filters + overflow-x hidden. Fixed via NEW src/components/modal.tsx portal (backdrop+Escape close, scroll-lock, first-field focus) used in admin-creatives, tutorials video, both new-vertical modals. (2) sidebar collapse toggle in dashboard layout (64px rail, width transition, localStorage cc-sidebar-collapsed, aria-expanded, operator dropdown pops out 230px). (3) plans New/Edit + phone-numbers Add converted from inline showForm cards to Modal popups, header buttons static labels, API/validation/toasts untouched. (4) thin violet scrollbars in src/styles/dashboard.css (Firefox thin+color + webkit 8px, styling-only).
- Decisions: shared Modal justified (4 consumers); softphone script modal + kebab portal + toasts deliberately left (render under .console with no transform/filter ancestor, unaffected); .modal-backdrop CSS unused, left alone; Tutorials OPERATIONS nav entry preserved.
- TODO: visual QA at 375/768/1280 (modal centering, rail at mobile breakpoint) - no screenshot tooling in env.
- Next: client UAT. Tests: npx tsc --noEmit 0.

## 2026-09-18 - assistant - ABOUT PAGE SHIPPED (public redesign)
- Did: replaced placeholder src/app/(public)/about/page.tsx with full obsidian/purple-glass design (hero VOIP telemetry card, genesis story + mission/vision tabs, legacy-vs-modern contrast, 6 engineering principles, 4 exec profiles, bottom CTA) — adapted to shared SiteHeader/SiteFooter (no duplicated chrome), server wrapper keeps metadata export, UI lives in about-client.tsx.
- Decisions: trial/demo CTAs route to /register + /#how-it-works; integrations link to /contact; ✕ glyphs replaced with lucide X; unused icon imports pruned.
- Broke / TODO: none. Next: visual check /about at 375/768/1280.
- Tests: npx tsc --noEmit 0 · npm run build clean (○ /about prerendered, zero errors).

- Tests: npx tsc --noEmit 0 · npm run build clean (○ /about prerendered, zero errors).

## 2026-09-18 - assistant - ABOUT PAGE V2 (ultra-premium redesign)
- Did: rewrote src/app/(public)/about/about-client.tsx to v2 spec — interactive telemetry console HUD (clickable edge/AI/agent pipeline nodes, animated 26-bar OPUS waveform, AI copilot card, live session inspector), legacy-vs-CoverageCalls contrast panels, 4-card bento grid (edge mesh ping grid, speech copilot, HIPAA vault, revenue attribution strip), agent-card leadership, signature purple CTA.
- Decisions: still on shared SiteHeader/SiteFooter (no duplicated chrome); trial → /register, demo → /#how-it-works; pipeline nodes keyboard-accessible (role=button + Enter/Space); pruned 13 unused lucide imports + dead activeTab state; data arrays (WAVEFORM_BARS, EDGE_NODES, ATTRIBUTION_STATS, TEAM) hoisted out of render.
- Broke / TODO: none. Next: visual check /about at 375/768/1280.
- Tests: npx tsc --noEmit 0 · npm run build clean (○ /about prerendered, zero errors).

## 2026-09-18 - assistant - CONTACT PAGE + REAL BACKEND (0052)
- Did: full loop, no fake submit — migration 0052 app.contact_messages applied live (4 statements) + contactMessageSchema in validate.ts + POST /api/v1/public/contact (per-IP 5/min limit, zod 422, NULLIF blanks, 201 + row id) + route.test.ts 4/4 (insert SQL/params, invalid email 422, empty message 422, limiter 429) + rewrote (public)/contact as contact-client.tsx + metadata wrapper on shared SiteHeader/SiteFooter (telemetry HUD, channel cards, dispatch form with inquiry pills + volume pills + error alert + success receipt, signature purple CTA).
- Decisions: separate contact_messages table (not leads — message body must be stored, leads keeps hashes only); status new/triaged/closed append-only; phone free-form max-32 (not E.164 — contact phones are best-effort); trial/demo CTAs → /register + /#how-it-works; pills keyboard-accessible via role=radio.
- Broke / TODO: staff inbox UI for contact_messages (query DB directly for now).

## 2026-09-19 - assistant - LIVE TRIAGE (auto-pause + 2 code bugs) - (1) Retreaver auto-pause explained: OUR 30s wallet-sync paused 8af3967c (log proof) because the only candidate was wallet_ineligible for $16 (log proof) - live pool was never funded (top-up happened on local only); fix on live: top-up + allocate >=$16 + pool enabled, then unpause (sync auto-unpauses when funded) - (2) FIXED ringing_expire_failed: requeueStuckRoutingCalls filtered on app.calls.updated_at which never existed; now measures from started_at + regression test asserting no updated_at in sweep SQL - (3) FIXED Recordings 500-class bug: app.recordings created without created_at (0001) while interface + findByAgency ORDER BY it - migration 0053 adds it (renamed from 0052, which collided with 0052_contact_messages from parallel session) - note: publisher-overview route cannot produce a findByAgency stack in current code; asked user for failing URL + live drift-check SQL - tsc src:0 - vitest: 592 pass | 5 skipped (66 files) - local migrate clean through 0053 - NOTHING deployed to live yet (pm2 rebuild+restart still required) - next: user funds live pool, runs 0053 on live, redeploys, reports failing URL if 500 persists
- Tests: npx tsc --noEmit 0 · vitest contact route 4/4 · npm run build clean (○ /contact static, ƒ /api/v1/public/contact, zero errors).

## 2026-09-19 - assistant - ENV-DRIVEN CHECKOUT URLS - new src/server/app-url.ts getAppBaseUrl (APP_BASE_URL > NEXT_PUBLIC_APP_URL > req origin > localhost:30001 dev default) adopted by all 4 Stripe checkout routes (agent/agent-subscription/agency-pool/generic) + retreaverWebhookUrl (was inline fallback) - .env.example APP_BASE_URL comment documents contract + fixes stale :3000 default - tests: app-url 6/6 + agency wallet env-URL route test - tsc:0 - vitest: 599 pass | 5 skipped (67 files) - nothing committed - next: set APP_BASE_URL per env (live https://coveragecalls.com, local ngrok URL), restart dev + redeploy live

## 2026-09-20 - assistant - CALL TESTING + WORKER/GATEWAY LATENCY + PUBLISHER/SOFTPHONE/ADMIN UI FIXES
- Did: verified stripe webhook DB secret override; diagnosed wallet not updating because no stripe listen / no session completion; updated all Stripe checkout + Retreaver webhook URLs to env-driven app-url helper; softphone UI premium polish: dock layout, blur removed, pointer-events isolated, minimize/restore call + script popups, volume control for #remoteMedia, modal pills, Take Calls link; publisher campaigns 'Failed to load' - found DB publishers have user_id null except 1 inactive, attribution zero; removed Go Online toggle from admin/publisher dropdown (agent-only), availability N/A shown for admin/publisher; confirmed async routing queue works via CALL_ROUTING_ASYNC=1, worker start scripts ready (npm run worker/gateway), call latency 10-15s traced to missing worker/gateway + async routing queue pickup; tsc:0; vitest: 599 pass | 5 skipped (67 files)
- Decisions: Go Online button must be agent-only; publisher portal needs linked user + attribution fix; APP_BASE_URL env drives all external redirects; softphone minimize buttons avoid overlay overlap.
- Broke / TODO: notifications table missing (repo uses app.outbox), email SMTP Gmail limits, call delay still 10-15s on live VPS until worker/gateway started, publisher campaigns still fail for unlinked users.
- Next: start worker on :3002 + gateway on :3001, fund live agency pool + allocate, run migration 0053 on live, verify publisher linking & attribution sync, test Stripe listen on :30001, monitor call routing latency after worker online.

## 2026-09-20 - assistant - PHASE 0.2 DONE (DID fail-closed, final-stretch kickoff)
- Did: phoneNumbers.findByE164 + findByCampaign now filter status='active' (phone-numbers.ts:19-33); removed random agency/campaign fallbacks in call-orchestrator.ts:70-104 — unknown/inactive/spare DIDs now throw (webhook maps to 400, no call row, nothing billed to wrong client); event.to normalized via normalizeE164 before lookup; cleared stale .next/dev types (gitignored build artifact blocking tsc).
- Tests: new fail-closed test (unknown DID rejects + create never called) + genuine-inbound test now seeds an active phone (old version passed with undefined agency — proof of the bug) + phone-numbers-status.test.ts 2/2 SQL asserts — suites: 53/53 pass (orchestrator 22, phone-numbers 2, phase5 29).
- Decisions: fail-closed over 400-safe fallback (mis-attribution > dropped call; publisher gets machine-readable rejection); status filter safe for all callers (orchestrator/retreaver/ping paths are routing-only; caller-ID presentation must also be active-only).
- Broke / TODO: Phase 0.1 live-env runbook is VPS-side (user action, see chat); retreaver.ts:95 null-phone path unchanged (skips row, correct).
- Next: Phase 1 connect-time + auto-pickup (awaiting go).
- Tests: npx tsc --noEmit 0 · targeted vitest 53 pass — nothing committed (not requested).

## 2026-09-20 - assistant - PHASE 1 DONE (queue singleton + soft-delete gate + auto-pickup)
- Did: NEW boss.ts shared start-once pg-boss singleton adopted by route-queue/finalize-queue/recording-store (enqueue no longer pays start() per call); agents.findAvailable now filters deleted_at IS NULL (comment always claimed it; partial index now actually applies); migration 0054 idx_phone_numbers_status_campaign (deliberately skipped (e164,status) — e164 UNIQUE already covers it); softphone auto-pickup: default-ON per-agent toggle (localStorage cc-auto-answer) + once-per-call effect covering socket + poll paths + reject-guard + audio-unlock best-effort + header Auto ON/OFF pill.
- Decisions: worker consumer untouched (0.5s poll + NOTIFY + batch5/burst already optimal; batchSize 1 would hurt throughput); routeCall pool-path already parallel (sequential only in-txn = pg constraint, documented in code); auto-pickup default ON per client billing concern (publisher bills from answer), PSTN-only agents unaffected (nothing client-side to answer, server bridge path unchanged).
- Broke / TODO: none. 0054 needs live apply (small, transaction-safe, IF NOT EXISTS).
- Next: Phase 2 publisher sync (awaiting go).
- Tests: npx tsc --noEmit 0 · vitest 606 pass | 5 skipped (70 files, +7 new: boss 3, find-available 1, Phase-0 3) · build clean — nothing committed (not requested).

## 2026-09-20 - assistant - PHASE 2 DONE (publisher switch + attribution repair)
- Did: acceptPortalInvite gains explicit switchFromAgency — agency members get 409 SWITCH_REQUIRED (UI shows leave-and-switch button) instead of dead-end; confirmed switch ends membership (suspended — the CHECK-allowed deactivated state) then links, returns switchedAgency flag; invites accept route passes {switch} from body; linkPair backfills retreaver campaign_id from authoritative app call; NEW backfillAttribution() repairs publisher-by-afid + campaign-by-cid NULLs from raw_redacted (bounded 7d, NULL-targeted, on the 5-min link tick); raw now stores afid at ingest (sync + webhook) so future rows are repairable (cid already was).
- Decisions: kept upsert COALESCE (preserving good data on re-sync is correct; NULL-lock fixed by repair job, not by clobbering); link window stays 120min (steady-state fine with 5-min cron; repair job covers history); membership ended as suspended (CHECK-allowed; resolveAuth + routing only honor active — fail-closed).
- Broke / TODO: pre-existing live rows ingested without afid in raw can't be SQL-backfilled — they repair via Retreaver re-sync overlap once afids are provisioned; UI leave-and-switch button still to be added on the register/invite screen (API ready).
- Next: Phase 3 routing integrity + agency-create + exports (awaiting go).
- Tests: npx tsc --noEmit 0 · vitest 609 pass | 5 skipped (70 files, +3: portal switch 2, backfill 1) · build clean — nothing committed (not requested).

## 2026-09-20 - assistant - PHASE 3 DONE (agency leave-create + exports + join backfill)
- Did: POST /api/v1/agencies leave-and-create — root cause of point 6: old guard was 100% dead (resolveAuth derives membership+agencyId from same row, pass path unreachable); now active members get 400 LEAVE_REQUIRED, confirmed leave moves membership in-txn, heads blocked from stranding agency, membership-less accounts get a head membership created; leaveAgency added to createAgencySchema; settings page gains Start-a-New-Agency section (explicit checkbox) — exports (point 7): leads/export + reports/export now validate format (400), leads honors privileged cross-agency + runtime nodejs, reports honors xlsx (was CSV-only lie); leads + reports pages use fetch+blob+toast (no more silent JSON downloads), params encoded.
- Decisions: schedule check stays scheduleOpen:true with code comment — no working-hours/timezone model exists, inventing fake hours would be worse; join-as-truth via 0055 backfill (single-join + legacy-NULL only, never overwrite) rather than rewriting billing SELECTs; membership.status CHECK has no 'inactive' (fixed Phase 2 to suspended).
- Broke / TODO: 0055 needs live apply (idempotent UPDATE); publisher-role export perms intentionally unchanged (portal has own payouts CSV).
- Next: Phase 4 Stripe 3% + GHL booking + payout-strip + prepaid/postpaid doc (awaiting go).
- Tests: npx tsc --noEmit 0 · vitest 619 pass | 5 skipped (73 files, +10: agencies 4, leads-export 4, reports-export 2) · build clean — nothing committed (not requested).

## 2026-09-20 - assistant - PHASE 4 DONE (fee + GHL booking + payout-strip, final stretch COMPLETE)
- Did: Stripe 3% (point 3): canonical stripeFeeCents in lib/format + migration 0056 payments.fee_cents + 3 checkout routes charge 2 line items (net credit + fee) with credit/fee metadata + payments.create stores fee + webhook credits NET (never gross) in all 3 wallet branches + breakdown UI on Ledger/agent/pool pages — also fixed 2 live payment bugs found en route: Ledger posted to nonexistent /wallet/recharge (404) and pool page read body.url instead of body.data.url (redirect never fired). Payout strip (point 2): agent/campaigns + generic campaigns (non-admin) responses stripped of all 4 payout fields; Browse UI fallback key removed. GHL booking (point 4): NEW shared ghl-booking.tsx embed; agent Book Call + admin Calendar rewritten GHL-only (slots UI deleted, APIs/tables kept for history). Docs: MANUAL_TEST_FLOW.md updated (live runbook, fee, auto-pickup, booking, exports, leave-create).
- Decisions: subscriptions keep face value (fee on fixed plan prices needs client call); upsert/webhook idempotency untouched; pool default $5000 untouched (pre-existing).
- Broke / TODO: 0056 live apply; Stripe Voyager/test clock for real $250 fee E2E still user-side; subscriptions fee decision open.
- Next: live deploy (migrations 0054-0056, pm2 worker+gateway+restart) + client UAT per MANUAL_TEST_FLOW.
- Tests: npx tsc --noEmit 0 · vitest 622 pass | 5 skipped (74 files, +13: strip 2, fee-mint 1, pool-checkout-fee update) · build clean — nothing committed (not requested).

## 2026-09-20 - assistant - ADMIN AGENCY-MANAGE FIX (follow-up Q)
- Did: admin role gains agency:manage in permission-data.ts (was view-only, so the Delete button on admin agency detail 403d and no live super_admin existed to do it); updated permission-data.test.ts expectation.
- Decisions: one-line matrix change over route-level carve-out — pool-wallet POST/PATCH also use agency:manage but require an agency membership admins don't hold, so no privilege bleed; users:manage stays super_admin-only.
- Tests: npx tsc --noEmit 0 · permission suites 21 pass — nothing committed (not requested).

## 2026-09-21 - assistant - THREE-ROLE RBAC COMPLETION (admin/agent/publisher)
- Did: fixed `allowHead` guard + agency Stripe URL field regression; remapped `super_admin/agency/manager/finance` code, routes, validation, seeds, and operational scripts to admin/agent/publisher with per-request head elevation.
- Decisions: kept historical migrations/docs naming for the removed roles; 0057 remaps rows while enum-label drops remain manual because they cannot run in the migration transaction.
- Broke / TODO: DB enum still lists removed labels until the manual `ALTER TYPE ... DROP VALUE` commands run; no runtime impact because inserts/validation only emit the three roles.
- Next: apply migrations 0054-0057 live, then run the manual enum-label drops.
- Tests: `npm run typecheck` clean · `npm test` 610 passed | 5 skipped (74 files) · `graphify update .` rebuilt 1287 nodes / 1239 edges.

## 2026-09-21 - assistant - NEW SUPABASE SETUP + INVOICE AUTO-SEND
- Did: pointed `.env` at the new Supabase URI; fresh DB needed Better Auth tables first, then fixed fresh-DB-only migration failures (0002 policy idempotency, 0028b orphan column folded into 0033, 0036/0050 empty-table setval + missing created_at, 0042 applied non-transactionally per its runbook, 0055 min(uuid) rewrite); seeded + login-verified admin@coveragecalls.com.
- Decisions: edited only unrecorded-on-fresh-DB migration files (recorded DBs skip them); auto-send is best-effort next to invoice creation with `sent_at/sent_to` idempotency (0058) so failures retry instead of rolling back invoices.
- Broke / TODO: legacy `role_name` enum labels still present (manual DROP VALUE step unchanged); campaigns not seeded — need names/pricing/states from client.
- Next: seed campaigns once specs arrive; Monday worker now auto-emails invoices to head + active agents.
- Tests: `npm run typecheck` clean · `npm test` 615 passed | 5 skipped (75 files, +5 invoice-delivery) · `check:migrations` 58/58 recorded · `graphify update .` 1294 nodes / 1253 edges.

## 2026-09-21 - assistant - CAMPAIGN SEED (9 live offers)
- Did: seeded 9 active campaigns on agency Public Leads — 4 default offers (FE CTV $50/30s, $70/90s; Medicare CG $16/30s, $35/120s) + 5 exclusive (Medicare CG $27/90s, $15/30s, $32/180s, $28/120s; FE CTV $65/90s) with matching price_cents/min_connected_seconds, visibility + is_exclusive flags.
- Decisions: status active (not draft) so routing can use them immediately; retreaver_cid NULL so Retreaver sync adopts/links them later; idempotent by (agency_id, name).
- Broke / TODO: none — remaining campaigns arrive via Retreaver sync as expected.
- Next: client UAT on live DB.
- Tests: seed verified 4 default + 5 exclusive rows · full suite still 615 passed | 5 skipped.

## 2026-09-21 - assistant - ENV FLAG + EMAIL COVERAGE + TEMPLATE REDESIGN
- Did: set `CALL_ROUTING_ASYNC=1` in `.env` (+ uncommented in `.env.example`); new `action-emails.ts` service (agent welcome on create, approval mail, member-invite mail — all best-effort via notify inbox+email); support replies + lead assignments now also email the requester/assignee.
- Decisions: root cause of "ugly emails" found — white wordmark logo on white header was invisible; header is now a violet gradient (Outlook solid fallback) with light body, zero black surfaces; all hooks `void`-fired so mail can never break the API call.
- Broke / TODO: none.
- Next: UI batch (settings/calendar/notifications/perf/login flash) via design-worker.
- Tests: `npm run typecheck` clean · `npm test` 624 passed | 5 skipped (76 files, +9 new).

## 2026-09-21 - assistant - UI BATCH 7/7 (settings/calendar/notifications/perf/login flash)
- Did: (1) /dashboard/settings branches on /api/v1/me — admin gets PLATFORM view (agency-creation toggle via PATCH system settings + Users/Agencies/System links, zero agency tabs/editing; members/phone-numbers redirect admin back); removed agent-visible dead link to /dashboard/admin/settings. (2) Agency LIST gains per-row Delete (confirm+toast+refetch, existing DELETE). (3) GHL iframe fixed 960px, scrolling=no, no inner container; admin calendar rewritten entries-only (Onboarding Slots + Bookings read-only tabs, APIs/tables untouched); booking widget stays agent-side on /dashboard/onboarding. (4) Nav audit: all hrefs resolve; fixed 2 orphans (Users→PEOPLE, Skills→OPERATIONS) + admin-calendar widget misplacement. (5) Suggest-form hidden for admin. (6) Notifications viewer-scoped (admin=all, agent=own+global) + scoped idempotent PATCH [id] (404 cross-agency) + NEW POST mark-all-read (UI called it, 404d before) + fixed top-right bell w/ badge+dropdown in all 3 dashboards. (7) Login flash: layout nav + dashboard home render skeleton until server role resolves (dashboard data now fetches once, not twice); notifications columns memoized.
- Decisions: heads stay agents (no members-page behavior change); dispatched_at keeps its dual read-flag meaning; bell is role-agnostic (endpoint scoped server-side).
- Broke / TODO: none. Visual QA at 375/768/1440 still user-side (no browser tooling here).
- Next: client UAT per MANUAL_TEST_FLOW.
- Tests: `npx tsc --noEmit` 0 · `npm test` 631 passed | 5 skipped (77 files, +7 notifications-scoped) — nothing committed (not requested).

## 2026-09-21 - assistant - VERIFY UI BATCH (independent re-check)
- Did: re-ran worker's batch from clean state — `npm run typecheck` 0 errors, `npm test` 631 passed | 5 skipped (77 files). All 7 items hold.
- Decisions: no code changes in verification; worker's PROGRESS entry above stands as the record.
- Broke / TODO: none. Visual QA at 375/768/1440 remains user-side.
- Next: client UAT per MANUAL_TEST_FLOW.
- Tests: `npm run typecheck` clean · `npm test` 631 passed | 5 skipped (77 files).

## 2026-09-21 - assistant - INVITE COPY + SOFT-DELETE LISTS + TEMPLATE POLISH
- Did: (1) invite email is now an app invite — no agency name, "create your own agency and invite your team once you're in" (`invites/route.ts` simplified, unused agency/smtp imports dropped). (2) Root-caused fake agency delete: base `findMany` never filtered `deleted_at`, so soft-deleted rows kept listing — new `skipDeleted` flag on BaseRepository enabled for agencies/agents/campaigns/calls/scripts/tutorials. (3) Tagline now pure white; CTA anchor enriched (17px/800/tracked, padding stays on the cell so Gmail can't collapse it).
- Decisions: lists hide deleted rows (delete = hide, never destroy); detail lookups untouched; invite keeps token link + 7-day copy.
- Broke / TODO: none. Note: restart dev so the new template serves (stale modules serve old HTML).
- Next: client UAT per MANUAL_TEST_FLOW.
- Tests: `npm run typecheck` clean · `npm test` 637 passed | 5 skipped (78 files, +6 soft-delete-lists).

## 2026-09-21 - assistant - EMAIL LINK ORIGIN + BROKEN INLINE STYLES
- Did: (1) publisher + agent invite links now env-first via getAppBaseUrl (was raw req origin → localhost links on VPS). (2) Root-caused unstyled emails: FONT constant used double quotes ("Segoe UI") inside style="..." attributes, terminating the attribute in every client and dropping all later declarations (colors, decoration) — switched to single quotes in email-templates.ts + notify.ts.
- Decisions: invite routes keep req origin only as last-resort fallback; no template structure change needed once quotes fixed.
- Broke / TODO: none. VPS must pull + rebuild + restart for both fixes to serve; verify logo file deployed at /images/coveragecallsfinal.png if header logo still missing.
- Next: client re-tests invite email on live.
- Tests: `npm run typecheck` clean · `npm test` 640 passed | 5 skipped (79 files, +2 invite-origin, +1 quote-guard).

## 2026-09-21 - assistant - PER-CAMPAIGN TRACKING NUMBERS
- Did: new "Tracking numbers" card on campaign RTB & Numbers tab (list + admin-only add/unassign, campaign pre-scoped); phone-numbers API is now admin-aware (GET ?campaign_id + platform-wide list, POST accepts agency_id for admin, PATCH cross-agency for admin, heads stay scoped); new findAllByCampaign/findAll repo methods.
- Decisions: per your call, numbers live on the campaign page only — settings phone-numbers untouched; add/unassign UI is admin-only (API settings:manage already restricted it); unassign parks as spare, never deletes.
- Broke / TODO: none.
- Next: client adds Telnyx DIDs per campaign on live, then test-call routing.
- Tests: `npm run typecheck` clean · `npm test` 646 passed | 5 skipped (80 files, +5 phone-numbers, +1 admin-scope).

## 2026-09-21 - assistant - FUNDING GATE + HEADER ACTIONS + BRIDGE WAIT + STRIPE VERIFY
- Did: (1) Go Online now requires funding (effective balance > 0 OR active plan) — enforced 422 in agents PATCH self + managed paths, toast surfaces reason in layout + take-calls. (2) Sticky top-right cluster beside bell: logout (all) + Online toggle (agents). (3) WebRTC pill: status dot (green/amber/cyan) + dark backing. (4) Stripe badge green only after live balance.retrieve ping (new POST verify; save adopts server verdict). (5) acceptCall bridge wait loop: removed bogus server answer() on outbound leg, 8×1s bounded retries, stops when call ends; Telnyx cancel swallows already-ended 422.
- Decisions: gate threshold is any positive funding (routing already enforces per-campaign price); no auto-offline on depletion (out of scope).
- Broke / TODO: none. Deploy + retest late-pickup bridge on live.
- Tests: `npm run typecheck` clean · `npm test` 655 passed | 5 skipped (82 files, +4 funding, +5 bridge-retry).

## 2026-09-21 - assistant - LIVE LIST 500s (memberships sort + leads ambiguity)
- Did: (1) `column created_at does not exist` — base findMany defaulted ORDER BY created_at, but app.memberships has no such column (hit via admin Users page) → new overridable defaultSort, memberships sorts by id. (2) `agency_id is ambiguous` — leads filtered list JOINs calls/dispositions sharing the name → all columns qualified l.* in count + select + sort.
- Decisions: fixed at repo layer (all callers inherit); also caught+reverted my own accidental safeOrder clobber via git diff review.
- Broke / TODO: none. Deploy + reopen Users/Leads pages to confirm.
- Next: client UAT per MANUAL_TEST_FLOW.
- Tests: `npm run typecheck` clean · `npm test` 657 passed | 5 skipped (83 files, +2 list-query-safety).

## 2026-09-21 - assistant - PUBLISHER EMPTY DASHBOARD
- Did: root-caused — portal campaign list was built ONLY from retreaver_calls rows, so assigned-but-quiet campaigns never appeared. getPortalOverview now LEFT JOINs assignments (join-table + legacy) with traffic stats on top; verified live: jai publisher's overview returns Medicare Short Buffer with 0s.
- Decisions: zero-stat rows list (not hidden); deleted/non-active campaigns excluded; single-row-per-campaign joins so aggregates can't fan out.
- Broke / TODO: none. Deploy + refresh publisher dashboard to confirm.
- Next: client UAT per MANUAL_TEST_FLOW.
- Tests: `npm run typecheck` clean · `npm test` 658 passed | 5 skipped (83 files, +1 portal zero-call listing).

## 2026-09-21 - assistant - HOMEPAGE FAQ (CMS-driven)
- Did: new FAQSection landing component (category tabs derived from data, accordion, GSAP, support card → /contact) placed on homepage below Testimonials, above CTA; homepage fetches CMS faq server-side (hides when empty); faq items gained category in admin editor + /faq page; seeded 6 Q&As live via scripts/seed-faq.mjs.
- Decisions: content stays in cms_sections faq (no new table — categories ride the existing items jsonb); no hardcoded fallback (empty CMS = hidden section, never dead headings).
- Broke / TODO: none. Deploy + scroll homepage to confirm.
- Next: client UAT per MANUAL_TEST_FLOW.
- Tests: `npm run typecheck` clean · `npm test` 668 passed | 5 skipped (85 files) · `npm run build` clean.

## 2026-09-21 - assistant - GAP AUDIT (backend + dashboards)
- Did: verified suspected gaps against code. Fixed: phone-numbers PATCH missing-campaign_id guard (schema already 422s — added explicit guard + test documenting it); MANUAL_TEST_FLOW 58→60 migrations. Confirmed non-issues: outbox IS the notifications store (live consumer), undefined-bind crash impossible via validation.
- Decisions: audit-only session otherwise — findings below go to the client as the remaining-work list.
- Broke / TODO: see remainder list in chat.
- Next: client picks items from the remainder list.
- Tests: `npm run typecheck` clean · `npm test` 669 passed | 5 skipped (85 files).

## 2026-09-21 - assistant - DASHBOARD BATCH (activity graph, drive links, layout moves)
- Did: (1) Call Activity now counts missed/failed (COALESCE started/ended + real per-state breakdowns, estimates only as legacy fallback). (2) Drive share links auto-rewritten to direct download at CMS save + render-time (old rows fixed too). (3) Agent home: Quick Actions ↔ Today's Goal swapped. (4) Onboarding gains Book Call / Campaign Updates tabs (full creative grid). (5) Take Calls: Live Campaigns search, Checklist↔Snapshot swap, equal 1fr/1fr grid. (6) CLIENT_TESTING_GUIDE refreshed with re-test list.
- Decisions: render-time normalization covers pre-fix rows; equal grid is CSS-only (mobile stacks as before).
- Broke / TODO: none. Deploy + visual check per guide.
- Next: client UAT per guide.
- Tests: `npm run typecheck` clean · `npm test` 680 passed | 5 skipped (86 files, +4 drive-link).

## 2026-09-21 - assistant - CLIENT FEEDBACK BATCH 2 (accept-202, postpaid, exclusives, admin-wide)
- Did: (11b) accept route 202-instant + background bridge + dedup guard + Cancel in connecting state; (1) agency postpaid_bypass (0061 live) in funding gate + routing tier 2, admin-only set, agency page invite-by-email + toggle; (2/3/4) own-agency GET for members, members refetch fix, auto-create stops silent joins, leave-create ensures agent rows; (5) exclusives hidden from browse unless assigned; (6) bidding exclusive-access panel + sectioned layout; admin lists (agents/campaigns/calls/invoices/leads/memberships) now platform-wide for admin, fail-closed otherwise; enum rebuilt to admin/agent/publisher live + 0062 guard migration.
- Decisions: postpaid rides tier 2 (prepaid keeps priority); invite accept joins invite agency ?? inviter agency; connecting Cancel calls existing hangup path.
- Broke / TODO: $1 Stripe triage + publisher explainer in chat; visual QA user-side.
- Next: deploy, retest per client list.
- Tests: `npm run typecheck` clean · `npm test` 676 passed | 5 skipped (86 files).

## 2026-09-21 - assistant - CLIENT FEEDBACK BATCH (11 items)
- Did: (11) accept route returns 202 instantly + background bridge loop with dedup guard; connecting state gains Cancel; (2/3/4) agency GET visible to own members, members-page refetch fix, auto-create stops silent first-agency join, leave-create ensures agent rows; (1) agency postpaid_bypass (0061, live) honored by funding gate + routing tier 2, admin-only to set, admin agency page gains invite-by-email + postpaid toggle; (5) exclusive campaigns hidden from agent browse unless assigned; (6) bidding tab exclusive-access panel (agency/agent multi-select) + sectioned layout; (9) seeded Terms body live (privacy already had content); toasts/loaders verified on touched flows.
- Decisions: heads can't self-grant postpaid (403); invite accept joins invite.agency_id ?? inviter agency; unassign parks spare; publisher-assignment visibility was already fixed — needs VPS deploy to show.
- Broke / TODO: $1 Stripe triage + publisher explainer in chat; visual QA user-side.
- Next: deploy (0061), retest all 11 per client list.
- Tests: `npm run typecheck` clean · `npm test` 674 passed | 5 skipped (86 files).

## 2026-09-21 - assistant - NEW ABOUT PAGE
- Did: replaced old About with the new design (hero + globe + floating badges, animated stat counters, mission cards, impact map, CTA banner) as TSX + scoped CSS module; dropped its duplicate header/footer (public layout already renders them); links pointed at real routes (/register, /login, /contact, /blog); uses existing /images/globe.png + /images/map.png; reduced-motion guard on idle animations.
- Decisions: CSS-module scoping (pasted global selectors would have collided with app styles); no duplicate nav/footer; "Meet the Team" → "Talk to Us" (/contact) since no team section exists.
- Broke / TODO: none. Deploy + open /about to confirm.
- Next: client UAT per MANUAL_TEST_FLOW.
- Tests: `npm run typecheck` clean · `npm test` 668 passed | 5 skipped (85 files) · `npm run build` clean.

## 2026-09-21 - assistant - CMS BLOG (archive + single + manager)
- Did: new app.blog_posts table (0060, applied live) + repo + validate + admin CRUD (/api/v1/cms/admin/blog) + public feed (/api/v1/cms/blog, cached 60s, drafts never leak) + shared markdown lib (XSS-safe, TOC extraction) + /blog archive (featured hero, category tabs, search, newsletter→contact inbox) + /blog/[slug] (progress bar, scroll-spy TOC, share/copy, tags, author card, related) + CMS Blog tab (table, modal editor, markdown preview, publish/featured toggles) + 7 seeded posts + header/footer Blog links.
- Decisions: content lives in DB (not hardcoded) — edits go live immediately; skipped CoverageFooterCTA (public layout already renders SiteFooter); newsletter reuses contact inbox as inquiry_type=newsletter; native scroll observers instead of ScrollTrigger (App Router safe).
- Broke / TODO: none. Deploy + open /blog to confirm.
- Next: client UAT per MANUAL_TEST_FLOW.
- Tests: `npm run typecheck` clean · `npm test` 668 passed | 5 skipped (85 files, +6 markdown, +4 blog-feed) · `npm run build` clean (all blog routes compiled).

## 2026-09-21 - assistant - SPEED VERDICT + CLIENT GUIDE
- Did: audited ring path for further speedups — pipeline already optimal (NOTIFY instant + 0.5s poll floor, 12 workers, parallel queries); only live check left is confirming NOTIFY isn't falling back to polling (worker log warning = point worker at direct 5432). Wrote docs/CLIENT_TESTING_GUIDE.md (all 3 dashboards in plain words + E2E call test + speed/charge fixes explained).
- Decisions: no code change — remaining seconds are Telnyx dial + human pickup, not our pipeline; guide is client-facing, no jargon.
- Broke / TODO: none.
- Next: client tests per guide; check worker log for notify fallback.
- Tests: no code touched (docs only).

## 2026-09-21 - assistant - PAYMENTS FIX + SECURITY AUDIT
- Did: new 0059 adds missing agent_id/plan_id to app.payments (agent top-up 500 root-caused: code wrote columns no migration ever created); applied live, verified 59/59 recorded + columns present. Security audit: all webhooks verified (Telnyx Ed25519→401, Stripe constructEvent→401, Retreaver token fail-closed, gateway Bearer + prod-closed + session sockets), zero NEXT_PUBLIC secrets, layout role-redirects on all dashboards, XSS-safe markdown (escapes first, https-only links).
- Decisions: nullable FKs on payments (pool top-ups carry neither); no code changes from audit — posture is solid.
- Broke / TODO: none.
- Next: client UAT per MANUAL_TEST_FLOW.
- Tests: `npm run typecheck` clean · full suite re-run pending.

## 2026-09-24 - assistant - CLIENT 9-POINT BATCH COMPLETE (#2,4,7,8,9)
- Did: (2) Call Activity fallback — bins fetched call rows by day when reports endpoints return empty, so the grouped-bar chart never sits empty while calls exist. (8) Device gate everywhere — layout header/sidebar toggles now block Go Online + redirect to Take Calls when `cc-device-ready` is missing, one-shot layout self-heal forces stale online sessions offline, Take Calls toggle re-verifies device; also fixed pre-existing `allReady` TDZ typecheck error by moving the self-heal effect below its declaration. (7) Creatives get Preview (Drive viewer) + Download (direct) + Open-in-Drive/View buttons on hero/feed/updates cards + `driveFileId`/`drivePreviewUrl` helpers. (4) Removed Blog Posts from CMS Sections (quick-add, editor, table filter — old rows kept in DB, Blog tab untouched) + segmented capsule tab control with section count. (9) Phone Numbers tab hidden from non-head agents in settings/members + heads-only notice on the page itself; the two agency cards kept (edit-current vs leave-and-create are distinct flows).
- Decisions: device check stays per-browser localStorage (server can't verify mic/speaker); layout heals but doesn't nag on Take Calls page (it heals there); no API permission changes — UI gating only.
- Broke / TODO: none. Deploy + live check: Call Activity with real calls, Drive preview on agent home, online-gate as agent, CMS tabs, settings as non-head agent.
- Next: client UAT per CLIENT_TESTING_GUIDE.
- Tests: `npm run typecheck` clean · `npm test` 688 passed | 5 skipped (86 files, +6 drive helpers).

## 2026-09-24 - assistant - CALL-CONNECT OVERHAUL (WebRTC answer path, zero-delay)
- Did: root-caused call #2 (422 loop → missed) to the browser leg never being answered, not backend/Redis/sockets — (1) NEW telnyx-call-tracker.ts: ID-matched hangup clears (a prior call's late hangup can no longer wipe the current call ref — the back-to-back race), correct SDK phases (SDK never emits `answered`; answering allowed from ringing/answering/early only). (2) use-telnyx-webrtc.ts rewritten as a ref-counted SINGLETON: Softphone + Take Calls share one TelnyxRTC client (second competing SIP registration eliminated, survives page navigation) with per-leg console lifecycle logs. (3) Softphone accept() now fires SDK answer + bridge POST concurrently (was serialized, ~seconds of media negotiation blocked the bridge). (4) Popup shows Answering…/Bridging… from the real SDK phase + explicit warning when the browser never received the INVITE. Take Calls needed no change (reads shared isReady/error).
- Decisions: server retry loop kept as-is (correct behavior — bridges the instant the leg answers); no retry-count change; mute/DTMF operate on the shared call.
- Broke / TODO: none. Live verify: real call → browser console must show `leg … state=ringing → phase=ringing`, `answer START`, `answer COMMAND OK`, bridge success <2s; stale-hangup lines prove race is contained.
- Next: client live call test with console open.
- Tests: `npm run typecheck` clean · `npm test` 698 passed | 5 skipped (87 files, +10 tracker) · `npm run build` clean (160 static pages).
- Follow-up fix: `getSnapshot`/`getServerSnapshot` returned a fresh object literal per call → React infinite loop (`Maximum update depth`, Softphone crash). Now returns cached `EMPTY_SNAPSHOT`. Typecheck clean, tracker tests green — reload dashboard to verify.

## 2026-09-24 - assistant - STRIPE HARDENING + ADMIN PAYMENTS + HOOKS FIX
- Did: (hooks) take-calls crashed (`Rendered more hooks`) — self-heal ref/effect sat after the `if (loading)` early return; hoisted all readiness computations + heal hooks above it. (stripe) Sept-22 $1 forensics: most likely a payable Stripe session with no app row (session created BEFORE payments insert; any DB failure after = Stripe paid, webhook 404d, wallet never credited) — fixed 4-layer: checkout routes expire the session when the row insert fails (agent/pool/generic) + webhook find-or-create heals orphans from metadata + wallet-first credit with 23505 convergence (crash between credit and status flip can no longer strand) via NEW payment-credit.ts service + NEW POST /api/v1/payments/reconcile (Stripe-verified, idempotent, owner/head/admin-scoped) that the agent success page now calls automatically with {CHECKOUT_SESSION_ID}. (admin) NEW /dashboard/admin/payments (FINANCE nav): totals, full history, Stripe links, per-row Verify, paste-session recovery + NEW GET /api/v1/payments (admin all, head agency, agent own). (wallet) top-ups now $1/$250/$500/$1000 (default $250) + verifying indicator.
- Decisions: no schema migration (expire-instead-of-row-first needs none); reconcile covers top-ups only, subscriptions stay webhook-only; publisher blocked from reconcile (no wallet:recharge).
- Broke / TODO: none. Live: pull+rebuild+restart, then reconcile the real Sept-22 $1 from Admin → Payments (paste cs_…) or Stripe dashboard must show the webhook endpoint + deliveries healthy.
- Next: client live $1 test with console + Stripe webhook log open.
- Tests: `npm run typecheck` clean · `npm test` 708 passed | 5 skipped (89 files) · `npm run build` clean (+/api/v1/payments /reconcile, /dashboard/admin/payments).

## 2026-09-24 - assistant - FUNDING-AND GATE + MONEY/TICKET MAIL + ISOLATION + LEDGER
- Did: (gate) Go Online now needs BOTH subscription AND top-up — fundingStatus AND-rule (postpaid agencies exempt), PATCH 422s rewritten, /agent/funding truthful (postpaid/needs flags), Take Calls gains Funding checklist row + dynamic x/N counts. (mail) new walletTopup/subscriptionActive/ticketRaised templates+subjects, sendWalletTopup/sendSubscriptionActive/sendSupportTicketRaised (agent receipt + head copy, inbox+email, never-throw) wired into payment-credit, subscription webhook (first activation only), tickets POST. (isolation) CONFIRMED agents saw each other's data: calls list, wallet entries, earnings, recordings list+by-call, call detail all forced to own-agent for plain agents (heads/admins unchanged); publishers untouched (own portal routes). (ledger) admin Ledger: Money In/Out/Net strip, direction pills + type filter, Direction/Agent/signed-amount columns, full timestamps.
- Decisions: routing tiers untouched (only the go-online gate is AND); "admin" mail = agency head (platform has no mailbox); ledger summary covers last 500 entries (paginated table can't carry running balances honestly).
- Broke / TODO: none. Live: SMTP must be configured or mails queue as warnings only; verify gate as agent (sub-only and topup-only both blocked).
- Next: client UAT funding gate + live $1 with mailbox open.
- Tests: `npm run typecheck` clean · `npm test` 727 passed | 5 skipped (94 files: +funding AND, +12 isolation, +ticket mail, +template subjects) · `npm run build` clean.

## 2026-09-24 - assistant - REVIEW FIXES (reviewer FAIL → all findings addressed)
- Did: independent reviewer FAIL on funding/mail/isolation/ledger/call-connect — fixed every finding: (crit) calls PATCH now enforces same ownership as GET (shared requireCallAccess helper; generic update can no longer hijack teammates' calls); singleton subscribe is global (first mounter no longer stuck), creation deduped, 30s grace teardown (StrictMode/nav-safe). (major) /agent/funding unified on fundingStatus (agency-scoped min-price as info only); credit loser returns credited:false + no second receipt; orphan-create 23505 converges via re-read; subscription webhook validates agent/plan + isolated mail; take-calls all counts use readyChecks.length + Funding visual row + checking/unverified tri-state; softphone hangs up browser leg on bridge failure + catches POST throw; ledger summary labeled last-500 + filters paginate honestly. (minor) preheader plain-text, CTA href escaped, wallet catch, take-calls comment. Acknowledged without change: earnings agency-missing ok([]) pattern, pool reconcile head-only, tickets GET agency-wide (queue by design).
- Decisions: DELETE calls stays permission-gated (agents lack calls:delete); routing tiers untouched; logout teardown delayed 30s (harmless SIP linger).
- Broke / TODO: none. Deploy + live call test with console open remains the final proof.
- Next: client UAT.
- Tests: `npm run typecheck` clean · `npm test` 735 passed | 5 skipped (96 files: +payment-credit races, +PATCH ownership) · `npm run build` clean.

## 2026-09-24 - assistant - STRIPE MODES + LIVE-ONLY PAYMENTS + LEDGER TWEAKS
- Did: (modes) test/live switcher in Admin → System Settings — per-mode key pairs stored encrypted, switching mirrors the pair into the active slots (single switch, zero checkout/webhook code paths touched), per-mode verify + configured dots + REAL-charges warning; STATUS/PUT/POST APIs extended. (payments) migration 0063 adds payments.livemode (backfilled true — pre-mode rows were real charges); captured at checkout + confirmed at webhook/reconcile; admin Payments defaults to LIVE with Live/Test/All pills + Mode column; API ?mode filter for all roles. (ledger) Current Balance moved into the metrics strip (Balance/In/Out/Net), big card removed; Transfer is now a popup (shared Modal) with "internal ledger move, no Stripe" note + ledger refreshes after send. Transfer = pure internal ledger (agency→agent paired entries, one DB txn, no Stripe).
- Decisions: livemode default true (history predates test mode); mode null = legacy single-key behavior (nothing breaks until admin switches); test secret naming sk_test/whsec enforced server-side.
- Broke / TODO: 0063 needs live apply (`npm run migrate` on VPS). Localhost webhook secret: `stripe login` once, then `stripe listen --forward-to localhost:30001/api/webhooks/stripe` (prints whsec_… → paste as Test webhook secret). Then test checkout → session paid → wallet credits via webhook.
- Next: client saves test keys, switches to test, runs $1 test payment end-to-end.
- Tests: `npm run typecheck` clean · `npm test` 745 passed | 5 skipped (98 files: +stripe-mode, +settings-stripe, +livemode stamp, +mode filter) · `npm run build` clean · `migrate` applied 0063 locally, `check:migrations` 63/63.

## 2026-09-24 - assistant - SUBSCRIPTION RECOVERY (paid but not reflected)
- Did: root-caused — subscription activation depended ENTIRELY on the webhook (no reconcile path) while the success page showed a static "now active" banner on URL param alone. Fixed 4-layer: checkout expire-on-failure + livemode + session-id success URL; reconcile now activates subscriptions too (find-or-create payment, 23505-tolerant sub create, receipt mail on first activation, idempotent redelivery); success page verifies via reconcile then refetches (honest verifying/active/pending banners, no more false celebration). Bonus holes closed: GET subscriptions forced to own agent (was any-agent_id + unscoped), POST free path now 402s paid plans (direct insert could mint paid plans free).
- Decisions: reconcile doubles as the subscription backstop (same authZ as top-ups); AND-gate unchanged (new subscribers still need a top-up to go online — Take Calls Funding row says so).
- Broke / TODO: none. Live triage for the stuck purchase: Stripe dashboard → payment + webhook deliveries; app.payments row status; agent_subscriptions row; then Admin → Payments → Verify or agent reopens Subscriptions (auto-reconciles).
- Next: client re-tests paid subscription end-to-end.
- Tests: `npm run typecheck` clean · `npm test` 751 passed | 5 skipped (99 files: +reconcile-subscription, +sub isolation/guard) · `npm run build` clean.

## 2026-09-24 - assistant - EVENT-DRIVEN BRIDGE WAKE (2657ms → sub-2s path)
- Did: live log showed bridge succeeding only on attempt 3 — the agent-leg `connected` webhook arrived mid-loop but was dropped (handler ignored everything while ringing), so acceptCall slept out a blind 1s gap. Now the webhook stamps routing_snapshot.agent_answered_at when the event's leg matches provider_agent_call_id (caller-leg echoes still ignored), and the bridge loop polls the stamp every 200ms within the same 8-attempt/8s budget. Multi-instance safe (DB flag, no new infra); existing test contract preserved.
- Decisions: JSONB snapshot merge, zero migrations; caller echo explicitly excluded by leg-id match.
- Broke / TODO: none. Deploy + retest: expect bridge success on attempt 1-2, accept total well under 2s.
- Next: live call retest with pm2 logs.
- Tests: `npm run typecheck` clean · `npm test` 753 passed | 5 skipped (99 files: +agent-leg stamp ×2, +fast-wake) · `npm run build` clean.

## 2026-09-24 - assistant - TRACKING LINKS LIVE (/t/[afid])
- Did: the dead "Get tracking link" toast is now a real endpoint — public /t/[afid]?cid= page (no login, force-dynamic, noindex) resolving afid → active assigned campaign → live tracking DID into a branded click-to-call card (tel: button, recording disclosure, zero payout/afid leakage); 404 unless every check passes so unassigned campaigns can't be advertised. Migration 0064 tracking_clicks (no PII) + per-campaign 30d click stats in the portal card + working clipboard copy (origin-aware links, no more hardcoded domain) + NEW GET /api/v1/publisher/clicks.
- Decisions: page shows the number (the missing piece — portal never displayed DIDs); attribution stays Retreaver-side as today; clicks logged best-effort, never block render.
- Broke / TODO: 0064 needs live apply. Honest limit: direct-DID calls still don't attribute to publishers (shared numbers carry no afid) — per-publisher DIDs would be the follow-up if needed.
- Next: deploy + open a real tracking link on mobile (tap-to-call check).
- Tests: `npm run typecheck` clean · `npm test` 764 passed | 5 skipped (101 files: +tracking-link ×9, +clicks API ×2) · `npm run build` clean (+/t/[afid], /api/v1/publisher/clicks) · `migrate` applied 0064 locally.

## 2026-09-24 - assistant - CALLS EXPORT 500 (nonexistent column + isolation)
- Did: export ordered by c.created_at — a column app.calls never had (uses started_at; same family as the old updated_at/created_at audit finds) → every CSV/XLSX export 500d. Fixed to started_at DESC NULLS LAST. Same-file audit: leads/export valid (leads.created_at exists), reports/export valid (started_at); leads list+export intentionally agency-wide (shared pipeline — matches list behavior, documented). Hardened calls/export along the way: plain agents now export only their own calls (was a teammate-data leak by another door), LIMIT 5000 cap.
- Decisions: no migration (query-only fix); leads scoping unchanged by design.
- Broke / TODO: none. Re-export on live to confirm.
- Next: client re-tests calls CSV + XLSX.
- Tests: `npm run typecheck` clean · `npm test` 769 passed | 5 skipped (102 files: +calls-export ×5) · `npm run build` clean.

## 2026-09-24 - assistant - NOTIFICATIONS + ONBOARDING + ADMIN CALENDAR BATCH
- Did: notifications table drops raw Payload for a human Message column (search still matches payload invisibly). Campaign Updates out of Onboarding tabs into own /dashboard/campaign-updates page, nav below Book Call (Newspaper icon). Onboarding is Book Call only + booked state: ?booked=1 (GHL thank-you redirect) or manual "I've booked my call" (localStorage) → ✓ BOOKED banner + Book again reset. Admin Calendar nav entry removed (page now redirects to /dashboard/admin; internal slots/bookings APIs kept for history).
- Decisions: GHL iframe cannot report bookings — honest client-side state is the only option short of GHL webhooks; calendar stays visible under the banner for re-booking.
- Broke / TODO: none. GHL side: set the calendar's thank-you redirect to /dashboard/onboarding?booked=1 for automatic state.
- Next: client checks onboarding flow + retired calendar link.
- Tests: `npm run typecheck` clean · `npm test` 769 passed | 5 skipped (102 files) · `npm run build` clean.

## 2026-09-24 - assistant - LIVE ROUTING DIAGNOSIS (multi-agent complaint)
- Did: read-only diag on live DB (temp scripts, deleted after). Tonight 22:47 triple-miss (CL-0016/17/18, no_eligible) fully explained per call: AG-0002 state_mismatch (caller VA/TF not in AG-0002's 9-state list), AG-0001 busy (mid-call), AG-0003 not live for campaign 8585 (no selection row — and once anyone opts in, legacy-open closes for all). Current pool for 8585: AG-0002 only (AG-0001 offline, AG-0003 not live). 7/9 recent calls carry caller_state TF (non-geographic test NPA — mismatches every state-restricted agent). Router followed rules exactly; no misroute, no stuck rows, AND-gate funded on all three.
- Decisions: no code change — operational fixes (AG-0003 Live toggle, AG-0002 add VA / test from real NPA, AG-0001 Go Online; login != online). Offered: surface skip-reasons in admin call detail; per-publisher DIDs; call-waiting scope.
- Broke / TODO: none.
- Next: client applies the three toggles, retests with real-NPA caller.
- Tests: untouched (diagnosis only).

## 2026-09-24 - assistant - FAQ PREVIEW + CONCURRENCY DIAGNOSIS
- Did: homepage shows first 3 FAQs + View-all link (FAQSection moreHref prop); /faq reuses the same FAQSection (accordion parity guaranteed, dead custom list deleted). Concurrency deep-dive (no code change — design verified correct): no platform concurrency cap exists anywhere; the ONLY gate is 1-agent-1-call (is_busy from live ringing/connecting/connected calls, enforced in ping + routeCall + eligibility). Max concurrent = eligible agents; their own log showed candidates=1 (pool depth 1-2). New AND-gate likely shrank their pool (sub-only/topup-only agents no longer routable) — check Take Calls Funding rows. Stuck ringing rows pin agents busy until the 45s expire sweep. External ceilings to check: Telnyx connection concurrent-channels + Retreaver campaign caps.
- Decisions: no call-waiting/second-line feature started (browser softphone tracks one call; needs product call).
- Broke / TODO: none.
- Next: client confirms 3-FAQ homepage + /faq; adds a 3rd eligible agent to prove 3 concurrent calls.
- Tests: `npm run typecheck` clean · `npm test` 769 passed | 5 skipped (102 files) · `npm run build` clean.

## 2026-09-24 - assistant - SINGLE AGENCY CARD (profile removed)
- Did: agent Settings Agency tab now shows only agency creation — removed the Agency Profile edit card (name/retention) + its dead state/handlers. A slim current-agency chip stays for context; heads edit profile via platform admin. Empty states kept for creation-disabled.
- Decisions: profile editing is admin-only now (Admin → Agencies); no API changes.
- Broke / TODO: none.
- Next: client checks Settings tab.
- Tests: `npm run typecheck` clean · `npm test` 769 passed | 5 skipped (102 files) · `npm run build` clean.

## 2026-09-24 - assistant - CLEANUP + NEW CLIENT TEST GUIDE
- Did: deleted 10 orphaned root debug scripts (check-*/verify-*/live-*/start-dev.mjs/fix-hero.py — none referenced by any npm script); docs are already lean (14 live files, all specs/logs/guides — nothing removed). Rewrote docs/CLIENT_TESTING_GUIDE.md v2 covering all new logic in 13 plain-words sections (prep, call connect, AND-gate, device gate, top-ups, subscriptions, tickets, isolation, exports, CMS/tracking, booking, ledger, settings, publisher walkthrough, reconcile drill).
- Decisions: no vitest files touched (suite is the safety net); MANUAL_TEST_FLOW kept as the full-flow companion.
- Broke / TODO: none.
- Next: client tests per new guide on live.
- Tests: `npm run typecheck` clean · `npm test` 769 passed | 5 skipped (102 files).

## 2026-09-24 - assistant - LIVE-FAILURE CLASS AUDIT (unverified success + webhook-only activation)
- Did: swept all 4 Stripe checkout routes + all 4 return pages for the subscription bug class (celebrate-on-URL, no reconcile). Found + fixed 2 more: pool page ignored returns entirely (no toast/refresh/reconcile — silent), admin Ledger read ?success=true while its own checkout sends ?payment=success (dead handler, no reconcile). Both now verify-then-refresh like the others. Confirmed clean: all checkout routes expire orphans + stamp livemode + return session ids; both wallet pages + subscription + pool + ledger all reconcile; no other Stripe API surfaces (no recurring/portal/invoice-charge code paths exist); webhook handles only checkout.session.completed.
- Decisions: no new APIs — reuse reconcile everywhere; pool/ledger toasts mirror agent-wallet wording.
- Broke / TODO: none. The money-in path now has no single point of failure: webhook OR success-page reconcile credits, orphans expire, duplicates converge, admin can Verify anything.
- Next: deploy + live $1 top-up and $X subscription re-test per flow.
- Tests: `npm run typecheck` clean · `npm test` 751 passed | 5 skipped (99 files) · `npm run build` clean.
## 2026-09-24 - assistant - CALLER HOLD MESSAGE (TTS) + POLL CAP
- Did: caller heard dead silence from early-answer to bridge. Now a fire-and-forget TTS holding line plays into the answered caller leg. Capped softphone ringing-poll backoff 15s to 5s. 4s-popup diagnosis pending timed pm2 lines.
- Decisions: TTS speak over audio-file playback (zero assets); default Telnyx voice; no stopPlayback in hot path.
- Broke / TODO: none. Deploy + live call: caller must hear the line, then bridge as before.
- Next: timed pm2 sequence for popup-delay verdict.
- Tests: typecheck clean, npm test 770 passed | 5 skipped (102 files: +hold-message), build clean.
## 2026-09-24 - assistant - HOLD-AUDIO CUT ON BRIDGE + FAILOVER REPLAY
- Did: cut the TTS tail on bridge success (fire-and-forget stopAudio, never on hot path) so instant bridges start clean; failover re-route replays a second holding line (second wait is no longer silence either). stopAudio swallows benign no-audio errors internally.
- Decisions: default voice kept; no stop on missed paths (leg hangup kills audio anyway).
- Broke / TODO: none. Deploy with the hold-message build; caller hears line, clean handoff on bridge.
- Next: timed pm2 sequence for popup-delay verdict.
- Tests: typecheck clean, npm test 772 passed | 5 skipped (102 files: +stopAudio cut, +failover replay), build clean.
## 2026-09-24 - assistant - TTS VOICE REQUIRED (live 10004)
- Did: live proved Telnyx rejects speak without explicit voice (10004). Set voice Telnyx.KokoroTTS.af (documented id). No behavior change otherwise.
- Broke / TODO: none. Redeploy + next inbound must show no speak error and caller hears the line.
- Tests: typecheck clean, orchestrator suite green.
## 2026-09-24 - assistant - TTS KILLED CALLS (unknown-event defaulted to ended)
- Did: live CL-0020 died at 2.6s the instant the hold message started. Root cause: normalizeEvent defaulted EVERY unmapped Telnyx type to ended, so call.speak.started was processed as a hangup (cancel both legs + missed). Our own feature murdered the call. Fixed: explicit speak/playback/gather mappings to the ringing no-op (same precedent as bridged/cost) + default unknown to ringing with loud warn log. Worst case now is a delayed sweep, never a murdered conversation.
- Decisions: follow the existing bridged/cost precedent, no new event type; warn on unmapped types so they get explicit mappings.
- Broke / TODO: none. Deploy urgently - every TTS call dies without this.
- Next: live call must hear full message, then bridge.
- Tests: typecheck clean, npm test 774 passed | 5 skipped (102 files: +audio mappings, +ringing no-op), build clean.
