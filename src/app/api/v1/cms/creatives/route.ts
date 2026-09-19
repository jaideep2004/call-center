import { apiHandler, ok, fail } from "@/server/api-utils";
import { campaignCreatives, agents, campaignAssignments } from "@/server/repositories";

export const runtime = "nodejs";

/**
 * GET /api/v1/cms/creatives — agent-visible creative feed (P2.1).
 * Live window enforced in SQL. Global rows (campaign NULL) show for
 * everyone; linked rows only for campaigns assigned to the agent/agency.
 * Hero callers slice to 3 client-side for the carousel.
 * Guard mirrors agent/campaigns (calls:view so the agent role can read).
 */
export const GET = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return fail("Agency required", 403);
  const placement = new URL(req.url).searchParams.get("placement");
  if (placement && placement !== "agent_hero" && placement !== "agent_feed") {
    return fail("placement must be agent_hero or agent_feed", 400);
  }
  let assigned: string[] = [];
  if (context.membership?.id) {
    const agent = await agents.findByMembershipId(context.membership.id).catch(() => null);
    assigned = await campaignAssignments
      .findCampaignIdsForAgencyOrAgent(agencyId, agent?.id)
      .catch(() => []);
  }
  const rows = await campaignCreatives.listFeedForAgent(
    agencyId,
    assigned,
    (placement as "agent_hero" | "agent_feed" | null) ?? undefined,
  );
  return ok(rows);
}, { resource: "calls", action: "view" });
