import { apiHandler, ok, fail } from "@/server/api-utils";
import { agents, walletEntries, agentSubscriptions, agentCampaignSelections } from "@/server/repositories";
import { queryOne } from "@/server/db";

export const runtime = "nodejs";

/**
 * GET /api/v1/agent/funding — can this agent actually receive calls, money-wise?
 * funded = active subscription with allowance OR effective balance
 * (personal ledger + agency-pool allocation) covers the cheapest live+active
 * campaign price (bid override wins). The router enforces the same rule per
 * call — this endpoint just surfaces it so Take Calls can refuse Go Online
 * with a useful message instead of letting agents sit online unrung.
 */
export const GET = apiHandler(async (req, context) => {
  let agentId: string | null = null;
  if (context.membership?.id) {
    try {
      agentId = (await agents.findByMembershipId(context.membership.id))?.id ?? null;
    } catch {}
  }
  if (!agentId) return fail("Agent profile not found", 404);

  const [effective, sub, liveIds] = await Promise.all([
    walletEntries.sumEffectiveByAgent(agentId).catch(() => 0),
    agentSubscriptions.findActiveByAgent(agentId).catch(() => null),
    agentCampaignSelections.getLiveCampaignIds(agentId).catch(() => [] as string[]),
  ]);

  let minLivePrice: number | null = null;
  if (liveIds.length > 0) {
    const row = await queryOne<{ min_price: string | null }>(
      `SELECT MIN(COALESCE(bo.price_cents, c.price_cents))::text AS min_price
         FROM app.campaigns c
         LEFT JOIN app.bid_overrides bo ON bo.campaign_id = c.id
        WHERE c.id = ANY($1::uuid[]) AND c.status = 'active' AND c.deleted_at IS NULL`,
      [liveIds],
    ).catch(() => null);
    minLivePrice = row?.min_price != null ? parseInt(row.min_price, 10) : null;
  }

  const hasSub = Boolean(sub);
  // No live+active campaign to price against: nothing to fund (the campaign
  // checks handle that case separately) — do not block on money here.
  const funded = hasSub || minLivePrice == null || effective >= minLivePrice;

  return ok({
    effective_balance_cents: effective,
    has_active_subscription: hasSub,
    min_live_price_cents: minLivePrice,
    live_campaign_count: liveIds.length,
    funded,
  });
}, { resource: "calls", action: "view" });
