# P1.5 — Marketplace Final Acceptance (17 items + exclusive addendum)

Date: 2026-09-15. Each item maps to code + test. All green: `npx tsc --noEmit` clean, 470+ tests pass, `npm run build` clean.

## P1.1 — Pricing + payout

1. **Edit price/payout -> next ping uses it, zero deploy.** `findManyWithBid` returns `effective_*` (override wins) — `src/server/repositories/campaigns.ts:198`; ping reads `COALESCE(bo.price_cents, c.price_cents)` — `ping-evaluator.ts:87`; route/finalize read `bidOverrides.findLatest` live. Test: `marketplace-pricing.test.ts` (4/4).
2. **4 client offers seeded** ($16/$10 30s, $35/$20 120s, $50/$35 30s, $65/$50 90s). `scripts/seed-marketplace-offers.mjs:13-16` (idempotent by name). Ranges Medicare $10–20 / FE $35–50 adjustable in Bidding tab.
3. **Visibility default/exclusive.** `campaigns.visibility/is_exclusive` (migration 0044), admin Bidding tab toggle, `validate.ts` campaign schemas.

## P1.2 — Take-Calls campaign selection

4. **Agent selects campaigns; Go Online requires >=1 live + device check.** `take-calls/page.tsx:377-389` (`campaignsReady` gates `canGoOnline`); `POST /api/v1/agent/campaigns/[id]/live`.
5. **Only live-for-campaign calls ring (never cross-fill).** `routeCall` filters via `findLiveAgentIds` (legacy-open fallback) — `call-orchestrator.ts:362-378`. Test: `call-orchestrator.test.ts` live-gate block (3/3 + effective-balance).
6. **Ping rejects when nobody is live.** Shared gate in `ping-evaluator.ts:findRoutableAgentId` (live EXISTS + legacy-open). Test: `ping-evaluator.test.ts` no-live + effective-balance cases.

## P1.3 — Pre-selection eligibility (before Retreaver)

7. **Buyer C ($30/$22, pub max $18) never enters the pool.** `eligibility.ts` `payout_above_max`. Test: `eligibility.test.ts` A/B/C case.
8. **Negative margin blocked; override wins.** `negative_margin` + `bid_not_configured`/`payout_not_configured` reasons. Test: margin + override cases.
9. **TX/FL state filtering (NPA-derived).** `state_mismatch`; empty `target_states` = any; anonymous callers pass unrestricted offers. Test: 3 state cases.
10. **Empty pool -> `no-target`, Retreaver never called.** `POST /api/v1/rtb/reserve` returns 200 before `reserveRtbReservation`. Test: `route.test.ts` no-target (reserve not called).
11. **Winner picked by Retreaver (Route-By-Bid); Node runs no bid loop.** Route makes exactly ONE `reserveRtbReservation` for the publisher campaign. Test: one-reserve case. No cross-offer round-robin code exists (`round_robin` = per-campaign agent order in `routing.ts:57`, kept).

## P1.4 — Dual wallets

12. **$2000/$1500/$1000 split from $5000 pool; effective = personal + allocation.** Migration 0046 (pool starts 0, never minted); `agencyWallets.setAllocation` + `sumEffectiveByAgent`; pool page enforces `Σ <= balance` (422). Tests: `agency-wallets.test.ts` (8/8), agency route cap test.
13. **Depleted buyer excluded next ping + paused in Retreaver.** Per-ping effective gate (`findRoutableAgentId`) + `syncOfferWalletPauses` (30s pg-boss `sync-offer-wallet-pauses`, change-only `setCampaignPaused`, busy ignored to avoid flapping). Tests: `offer-wallet-sync.test.ts` (8/8), `eligibility.test.ts` deplete case.
14. **No minting: pool only via Stripe webhook; allocations move within balance.** `agency_wallet_topup` branch (payments guard + `stripe_session` key + ledger row + `creditPool`). Tests: `route.pool.test.ts` (3/3: credit-once, redelivery-safe, 404).

## P1.5 — Billing + verification

15. **Finalize records winning bid/payout/margin.** `finalizeCall` computes effective bid/payout (override wins, strict nulls), margin = bid − payout; merged into `qualification_snapshot` inside the invoice-winner branch + `finalize_marketplace` JSON log. Reporting only — invoice totals untouched. Short calls log explicit zeros (`below_min_connected`); disposition calls log nulls (`disposition_based`). Tests: `finalize-call.test.ts` marketplace block (6/6).
16. **Duplicates are safe.** Finalize: invoice `ON CONFLICT (call_id)` anchor — redelivery returns `already_finalized`, margin merged once (tested). Reserve: `idempotency_key` (migration 0047 `client_key` unique) — redelivery returns original with `deduped: true`, no re-reserve; no-targets are NOT stamped so retries re-evaluate fresh. Tests: redelivery (finalize) + 3 idempotency cases (route).
17. **Short/unqualified calls bill 0 with a reason.** `totalCents = 0` below `min_connected_seconds` (unchanged) + marketplace zeros + reason; failed-invoice path unchanged (never throws, webhook returns 200). Tests: below-min + insufficient-balance cases.

## Addendum — real price sheet (2026-09-15)

Client data maps 1:1 onto the schema (`price_cents` = buyer price, `min_connected_seconds` = buffer):

- Defaults: FE CTV $50/30s + $70/90s, Medicare CG $16/30s + $35/120s → `visibility='default'`. Seeds updated; FE Long default corrected $65 → $70 (one-time safe migration in `scripts/seed-marketplace-offers.mjs`, admin edits never overwritten; already-deployed DBs need the one-click Bidding-tab edit).
- Exclusives ("Only For Agents/Agencies"): Medicare $27/90s, $15/30s, $32/180s, $28/120s + FE $65/90s → seeded `visibility='exclusive', is_exclusive=true`, draft + unassigned (head assigns in UI, sets payouts in Bidding tab — sheet lists buyer prices only).

18. **Exclusive inventory never leaks into the open pool.** `getEligibleOffers` SQL excludes `is_exclusive`/`visibility='exclusive'` (`eligibility.ts`); `routeCall` requires an assignment match for exclusive campaigns even with zero assignment rows (`call-orchestrator.ts:requireAssignment`). Tests: eligibility query-level exclusion + routeCall never-routes-openly.

## Out of scope (explicit)

- Disposition-based margin (own payout economics; `disposition_based` logged, revisit if client wants blended margin).
- Concurrent-duplicate reserve race: sequential redelivery dedupes; simultaneous same-key POSTs may both reserve (Retreaver confirms each uuid once; documented in `setClientKey`).
- Caps/concurrency rules: no caps columns exist; agent gate covers funding/availability/state/live today.
