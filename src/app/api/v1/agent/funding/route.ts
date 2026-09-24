import { apiHandler, ok, fail } from "@/server/api-utils";
import { agents, agentCampaignSelections } from "@/server/repositories";
import { fundingStatus } from "@/server/services/agent-funding";
import { queryOne } from "@/server/db";

export const runtime = "nodejs";

/**
 * GET /api/v1/agent/funding — can this agent actually receive calls, money-wise?
 * `funded` is the SAME verdict the availability toggle enforces (single
 * helper: subscription AND top-up, postpaid agencies exempt). On top it
 * reports whether the wallet covers the cheapest live+active campaign price
 * (bid override wins) so Take Calls can show the more specific "top up $X"
 * hint. The router enforces affordability per call — this endpoint just
 * surfaces both so Take Calls can refuse Go Online with a useful message
 * instead of letting agents sit online unrung.
 */
export const GET = apiHandler(async (req, context) => {
  let agentId: string | null = null;
  if (context.membership?.id) {
    try {
      agentId = (await agents.findByMembershipId(context.membership.id))?.id ?? null;
    } catch {}
  }
  if (!agentId) return fail("Agent profile not found", 404);

  const [status, liveIds, agentRow] = await Promise.all([
    fundingStatus(agentId),
    agentCampaignSelections.getLiveCampaignIds(agentId).catch(() => [] as string[]),
    agents.findById(agentId).catch(() => null),
  ]);

  let minLivePrice: number | null = null;
  if (liveIds.length > 0 && agentRow) {
    const row = await queryOne<{ min_price: string | null }>(
      `SELECT MIN(COALESCE(bo.price_cents, c.price_cents))::text AS min_price
         FROM app.campaigns c
         LEFT JOIN app.bid_overrides bo ON bo.campaign_id = c.id
        WHERE c.id = ANY($1::uuid[]) AND c.status = 'active' AND c.deleted_at IS NULL
          AND c.agency_id = $2`,
      [liveIds, (agentRow as { agency_id?: string }).agency_id],
    ).catch(() => null);
    minLivePrice = row?.min_price != null ? parseInt(row.min_price, 10) : null;
  }

  return ok({
    effective_balance_cents: status.effectiveCents,
    has_active_subscription: status.hasSubscription,
    agency_postpaid: status.agencyPostpaid,
    needs_subscription: status.needsSubscription,
    needs_topup: status.needsTopup,
    min_live_price_cents: minLivePrice,
    covers_min_live_price: minLivePrice == null || status.effectiveCents >= minLivePrice,
    live_campaign_count: liveIds.length,
    funded: status.funded,
  });
}, { resource: "calls", action: "view" });
