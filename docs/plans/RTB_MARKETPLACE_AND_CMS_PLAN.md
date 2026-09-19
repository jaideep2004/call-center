# Full Implementation Plan — RTB Marketplace (P1) + CMS Creatives & Tutorials (Last)

Date: 2026-09-14. Source: client 4 answers (Medicare/FE buffers, payout ranges, before-selection, dual wallets).
Order: **Marketplace first. CMS Creatives + Tutorials last (on hold).**
DoD per phase: `npx tsc --noEmit` clean + `npm test` pass + `graphify update .` after structural changes.

## 0. Term map (client -> code)

- Offer = `app.campaigns` row. E.g. Medicare Short 30s ($16/$10), Medicare Long 120s ($35/$20), FE TV Short 30s ($50/$35), FE TV Long 90s ($65/$50). File: `src/server/repositories/campaigns.ts:5`.
- Buyer Pricing = `campaigns.price_cents` (+ `bid_overrides.price_cents` for instant adjust). File: `src/server/repositories/bid-overrides.ts:4`.
- Publisher Payout (max, per campaign) = NEW `campaigns.max_publisher_payout_cents` (+ optional min). Market ranges: Medicare $10-20, FE $35-50, buffer 30-120s — all adjustable in Bidding tab.
- Buffer = `campaigns.min_connected_seconds`. Qualification unchanged.
- Default vs Exclusive = `campaigns.visibility` (`default` = open to all; `exclusive` = restricted). Restrict = rows in `app.campaign_assignments`. Files: `src/server/repositories/campaign-assignments.ts:88`, `0017_campaign_assignments.sql`.
- Agent live for campaign = NEW `agent_campaign_selections(agent_id, campaign_id, is_live)`. Today `agents.availability` is global (`take-calls/page.tsx:1`, `agents.ts`). Take Calls gets campaign selector per client wording.
- Wallets: keep `wallet_entries(agent_id)` + `sumByAgent/sumByAgency` (`wallet-entries.ts:53,61`). Add `agency_wallets` pool + allocations managed from Agency Dashboard.

## PART 1 — Marketplace logic (build now)

### P1.1 Pricing + payout fields (DB + admin)
- Migration `0044_marketplace_pricing.sql`:
  - `campaigns.max_publisher_payout_cents INT NULL, min_publisher_payout_cents INT NULL, visibility TEXT DEFAULT 'default', is_exclusive BOOL DEFAULT false`.
  - Indexes on `(status, visibility)`.
- Repos: extend `CampaignRow` + `create/update` (`campaigns.ts:55`), `findManyWithBid` returns `effective_max_payout_cents`.
- Validate: `validate.ts` campaign schemas add payout/visibility fields.
- Admin UI `campaigns/[id]` General + Bidding tabs: Buyer price + Max payout + Buffer + Default/Exclusive toggle. Seed the 4 client rows.
- Accept: edit price/payout -> next ping uses it, zero deploy.

### P1.2 Take-Calls campaign selection (agent live flag)
- Migration `0045_agent_campaign_selections.sql`: `agent_campaign_selections(agent_id, campaign_id, is_live, updated_at)` PK `(agent_id, campaign_id)`.
- API: `GET /api/v1/agent/campaigns` (exists: `agent/campaigns/route.ts`) add `is_live_for_me, buyer_price, max_payout, buffer, visibility`. NEW `POST /api/v1/agent/campaigns/:id/live {is_live}`.
- UI `take-calls/page.tsx`: campaign multi-select above Go Online. `Go Online` requires >=1 `is_live` + device check (existing gate stays). Browse page stays for discovery.
- Routing: `call-orchestrator.ts:275 routeCall` + `agents.findAvailable` must join `is_live=true` for `call.campaign_id`. No live agent for that campaign = `no_agent_available`, never cross-campaignfill.
- Accept: agent selects Medicare Short only -> only Medicare Short calls ring.

### P1.3 Pre-selection eligibility (BEFORE Retreaver picks — client Q3)
- NEW `src/server/services/eligibility.ts`: `getEligibleOffers({publisher_campaign_id, caller_state, publisher_payout_min/max})` returns offers where ALL hold:
  1. `campaigns.status='active' AND rtb_enabled` (publisher campaign + offer).
  2. `offer.max_publisher_payout <= publisher max` AND `>= publisher min`; `bid - payout >= 0` (margin guard).
  3. State match (`target_states` empty = any, else includes `caller_state` from NPA — `ping-evaluator`, `routing.ts:40`).
  4. Agency has >=1 live+available+approved+not-busy agent for that offer with endpoint overlap (`routing.ts:33` reasons).
  5. Wallet ok (P2) + caps/concurrency ok.
- `POST /api/v1/rtb/reserve` (publisher auth): runs eligibility, then ONE `retreaver.reserveRtb({key, publisherId: afid, caller_number})` (`domain/providers/retreaver.ts:31`). Empty set -> `no-target`, never blind-route. Keeps <300ms best-effort via cached NPA + single JOIN; accuracy over latency per client.
- Keep `selectAgent` (`routing.ts:47`) for agent-pick INSIDE winning offer only. Delete round-robin-across-offers as primary (per `do_not_build`).
- Retreaver sync: keep `retreaver-campaigns.ts` deploy + `retreaver-rtb.ts` reserve/confirm + `retreaver-link.ts`; add Route-By-Bid winner assumption (no custom bid loop in Node).
- Accept: Buyer C $30/$22 with max $18 never enters pool; highest of A/B wins; 1:01 re-evaluation drops depleted buyer.

### P1.4 Dual wallets (client Q4)
- Migration `0046_agency_wallets.sql`: `agency_wallets(agency_id PK, balance_cents, enabled)` + `agency_wallet_allocations(id, agency_id, agent_id, allocated_cents, updated_at)`.
- Repos: extend `wallet-entries.ts` with `sumEffectiveByAgent(agentId)` = personal sum + allocation. `agencies.ts` add `agency_wallet_enabled`.
- Eligibility wallet rule: `effective_balance >= effective_price` (override wins). Tier-1 prepaid first logic in `call-orchestrator.ts:339` stays, just with effective balance.
- APIs: `GET/POST /api/v1/agency/wallet` (pool balance, top-up via existing Stripe checkout `wallet/agent/create-checkout`), `PUT /api/v1/agency/wallet/allocations {agent_id, allocated_cents}` (head only).
- UI: Agency Dashboard wallet card ($5000 pool, per-agent rows, Remaining, enable toggle). Agent wallet page shows personal + allocated split.
- Sync job: every 30s + on `wallet_entries` insert, pause/unpause offer in Retreaver (`updateCampaign paused`) when balance < price. No per-ping wallet query on hot path.
- Accept: $2000/$1500/$1000 split works; depleted buyer excluded next ping.

### P1.5 Billing + verification
- `finalizeCall`: revenue = winning offer `bid`, cost = its `payout`, margin logged. `retreaver_calls.payout_cents/revenue_cents` already exist (`retreaver-calls.ts`).
- Tests: unit eligibility (range/margin/state/wallet), integration reserve with A/B/C fixtures, wallet-deplete, TX/FL, negative-margin block, duplicate ping idempotent, no-target path.
- Checklist maps to client Final Acceptance (17 items).

## PART 2 — CMS Creatives + Tutorials (LAST, on hold)

Do not start until P1 P1.1-P1.5 pass DoD.

### P2.1 Campaign ads (creatives)
- Today: `cms_sections` single JSON doc (`cms-sections.ts:1`), paste-URL only, no campaign link, no agent slot.
- Migration `0047_campaign_creatives.sql`: `campaign_creatives(id, agency_id, campaign_id NULL=all, type image/video, title, media_url, thumbnail_url, cta_label, cta_href, placement agent_hero/agent_feed, priority, active, starts_at/ends_at, deleted_at)`.
- Storage: Supabase bucket `cms-uploads` (5MB img / 50MB video) + `POST /api/v1/cms/upload`. Paste-URL fallback kept.
- Admin `admin/cms` new Creatives tab: table + Add modal (campaign select, upload-or-URL, CTA, hero/feed, schedule). Agent dashboard hero slot (1 featured) + feed below Quick Actions: `GET /api/v1/cms/creatives?placement=...` filtered active/date/campaign-assigned.
- Choices needed at build time: targeting = assigned-only vs all; hero = 1 vs carousel(3).

### P2.2 Tutorials (Ringel-like)
- Today: `tutorials` (`tutorials.ts:3`: agency_id/title/content/category/video_url/duration/tags) + list/new/detail pages, no thumbnail/order/progress.
- Migration `0048_tutorials_plus.sql`: `tutorials += thumbnail_url, order_index, published, required`; NEW `tutorial_progress(tutorial_id, user_id, watched_seconds, watched_percent, completed)`.
- Admin: thumbnail + order drag + Required toggle. Agent Tutorials page: category pills, cards, video modal, `PATCH progress` on timeupdate (90% -> completed). v1 = badge only, NOT blocking Go Live (decide at build).
- Video: bucket upload <50MB else YouTube/Wistia embed.

## Build order
P1.1 -> P1.2 -> P1.3 -> P1.4 -> P1.5 -> (client UAT on marketplace) -> P2.1 -> P2.2.
