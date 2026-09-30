import { apiHandler, ok, fail } from "@/server/api-utils";
import { leads, agents } from "@/server/repositories";
import { queryOne } from "@/server/db";

/**
 * POST /api/v1/leads/[id]/claim — an agent takes an unassigned lead for
 * themselves (the claim pool). Atomic single-statement claim: concurrent
 * claimers converge, exactly one wins (409 for the rest). Agents need only
 * the leads:view grant; the winner is always their own profile, resolved
 * server-side and never trusted from the client.
 */
export const POST = apiHandler(async (req, context) => {
  const { params, agencyId, user, membership } = context;
  const { id } = await params;
  const isAdmin = user?.role === "admin";
  const scope = isAdmin ? undefined : (agencyId ?? undefined);
  if (!isAdmin && !scope) return fail("Agency scope required", 403);
  if (!isAdmin && !membership) return fail("Agent membership required", 403);

  const me = !isAdmin && membership
    ? await agents.findByMembershipId(membership.id).catch(() => null)
    : null;
  if (!isAdmin && !me) return fail("Agent profile not found", 404);

  const lead = await leads.findById(id, scope).catch(() => null);
  if (!lead) return fail("Lead not found", 404);
  if (lead.assigned_agent_id) return fail("Lead already claimed", 409);

  // Heads/admins claiming explicitly pass themselves too (their membership
  // agent); plain agents always claim to self. Platform admins have no
  // agent profile — they assign via the dropdown (PATCH), not claim.
  const winnerId = me?.id;
  if (!winnerId) {
    return fail(
      isAdmin
        ? "Admins assign leads via the dropdown instead of claiming"
        : "Agent profile not found",
      404,
    );
  }

  const claimed = await queryOne<{ id: string }>(
    `UPDATE app.leads SET assigned_agent_id = $2, updated_at = now()
      WHERE id = $1 AND assigned_agent_id IS NULL AND deleted_at IS NULL
      ${scope ? "AND agency_id = $3" : ""}
      RETURNING id`,
    scope ? [id, winnerId, scope] : [id, winnerId],
  );
  if (!claimed) return fail("Lead already claimed", 409);
  const row = await leads.findById(id, scope).catch(() => null);
  return ok(row ?? { id, assigned_agent_id: winnerId }, "Lead claimed");
}, { resource: "leads", action: "view" });
