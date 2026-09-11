import { apiHandler, ok, fail } from "@/server/api-utils";
import { campaigns, agents, campaignAssignments } from "@/server/repositories";
import { queryOne } from "@/server/db";

export const runtime = "nodejs";

/**
 * POST /api/v1/agent/campaigns/[id]/join
 * Agent self-joins a campaign. Idempotent: inserts (campaign_id, agent_id) ON CONFLICT DO NOTHING.
 * Requires authenticated agent with membership->agent mapping.
 * Uses `calls:view` perm so agent can access without needing settings:manage.
 */
export const POST = apiHandler(async (_req, context) => {
  const { id } = await context.params;
  if (!id) return fail("Campaign id required", 400);

  // Verify campaign exists – allow any agencyId; browse shows cross-agency.
  // We try to fetch via direct query to avoid agency scoping for browse.
  const campaign = await queryOne<{ id: string; status: string }>(
    `SELECT id, status FROM app.campaigns WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [id],
  );
  if (!campaign) return fail("Campaign not found", 404);

  // Resolve agentId for this user
  let agentId: string | null = null;
  if (context.membership?.id) {
    const ag = await agents.findByMembershipId(context.membership.id);
    agentId = ag?.id ?? null;
  }
  if (!agentId) {
    // Fallback: try to find agent by user via membership lookup? maybe agent table via membership
    return fail("Agent profile not found - ensure you are provisioned as an agent", 403);
  }

  // Ensure not already assigned
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM app.campaign_assignments WHERE campaign_id = $1 AND agent_id = $2 LIMIT 1`,
    [id, agentId],
  );
  if (existing) {
    return ok({ campaign_id: id, agent_id: agentId, already_assigned: true }, "Already assigned to this campaign");
  }

  const row = await campaignAssignments.addAgent(id, agentId, context.user?.id);
  if (!row) {
    return fail("Failed to join campaign", 500);
  }

  return ok({ campaign_id: id, agent_id: agentId, assignment_id: row.id }, "Successfully joined campaign - admin will review if approval required");
}, { resource: "calls", action: "view" });
