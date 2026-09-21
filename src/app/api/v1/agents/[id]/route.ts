import { apiHandler, ok, noContent, fail, requireHeadOr } from "@/server/api-utils";
import { agents } from "@/server/repositories";
import { validate, updateAgentSchema, updateOwnAgentSchema } from "@/server/validate";
import { hasPermission } from "@/server/services/permission-data";
import { assertValidSkills } from "@/server/services/skills.service";
import { sendAgentApproved } from "@/server/services/action-emails";
import { canGoOnline } from "@/server/services/agent-funding";
import { queryOne } from "@/server/db";

export const GET = apiHandler(async (req, { params }) => {
  const { id } = await params;
  const agent = await agents.findByIdWithUser(id);
  return ok(agent);
}, { resource: "agents", action: "view" });

export const PATCH = apiHandler(async (req, { params, user, membership, agencyId, isHead }) => {
  const { id } = await params;
  // Phase 5: heads manage agents in their own agency (scoped update below);
  // platform admins keep matrix rights; everyone else is self-edit only.
  const canManage = Boolean(isHead || (user && hasPermission(user.role as any, "agents", "manage")));
  if (!canManage) {
    const agent = await queryOne<{ membership_id: string }>("SELECT membership_id FROM app.agents WHERE id = $1", [id]);
    if (!agent || !membership || agent.membership_id !== membership.id) {
      return fail("You can only update your own agent profile", 403);
    }
    const body = validate(updateOwnAgentSchema, await req.json());
    if (body.availability === "available" && !(await canGoOnline(id))) {
      return fail("Top up your wallet or activate a subscription plan before going online — unfunded agents can't take calls", 422);
    }
    const updated = await agents.update(id, body);
    return ok(updated, "Agent updated");
  }
  const body = validate(updateAgentSchema, await req.json());
  if (body.skills) {
    body.skills = await assertValidSkills(body.skills);
  }
  if ((body as { availability?: string }).availability === "available" && !(await canGoOnline(id))) {
    return fail("Agent has no funds or active plan — top up the wallet or activate a subscription before setting them online", 422);
  }
  const agent = await agents.update(id, body, agencyId ?? undefined);
  // Best-effort approval email + inbox row (never blocks the update).
  if (body.approval_status === "approved") {
    void sendAgentApproved({ agencyId: agencyId ?? "", agentId: id });
  }
  return ok(agent, "Agent updated");
}, { resource: "agents", action: "update" });

export const DELETE = apiHandler(async (req, context) => {
  requireHeadOr(context, "agents", "delete");
  const { id } = await context.params;
  const scope = context.agencyId ?? undefined;
  if (!scope && context.user?.role !== "admin") {
    return fail("Agency scope required", 403);
  }
  await agents.softDelete(id, scope);
  return noContent();
}, { resource: "agents", action: "delete", allowHead: true });
