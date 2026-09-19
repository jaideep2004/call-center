import { apiHandler, ok, fail } from "@/server/api-utils";
import { agents, campaigns, agentCampaignSelections } from "@/server/repositories";
import { z } from "zod";

export const runtime = "nodejs";

const liveSchema = z.object({ is_live: z.boolean() });

/**
 * POST /api/v1/agent/campaigns/[id]/live
 * Take-Calls campaign selector: agent marks themselves live (or not) for ONE campaign.
 * Idempotent upsert. Agents may only toggle their own row.
 */
export const POST = apiHandler(async (req, context) => {
  const { id: campaignId } = await context.params;
  if (!campaignId) return fail("Campaign id required", 400);
  let body: { is_live: boolean };
  try {
    body = liveSchema.parse(await req.json());
  } catch {
    return fail("is_live (boolean) is required", 400);
  }
  if (!context.membership?.id) return fail("No active membership", 403);
  const agent = await agents.findByMembershipId(context.membership.id);
  if (!agent) return fail("Agent profile not found", 404);
  const campaign = await campaigns.findById(campaignId).catch(() => null);
  if (!campaign) return fail("Campaign not found", 404);
  const row = await agentCampaignSelections.setLive(agent.id, campaignId, body.is_live);
  return ok(row, body.is_live ? "You are live for this campaign" : "Paused for this campaign");
}, { resource: "calls", action: "view" });
