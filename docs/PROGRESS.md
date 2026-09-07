
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
