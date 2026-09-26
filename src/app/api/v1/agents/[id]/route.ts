import { apiHandler, ok, noContent, fail, requireHeadOr } from "@/server/api-utils";
import { agents } from "@/server/repositories";
import { validate, updateAgentSchema, updateOwnAgentSchema } from "@/server/validate";
import { hasPermission } from "@/server/services/permission-data";
import { assertValidSkills } from "@/server/services/skills.service";
import { sendAgentApproved } from "@/server/services/action-emails";
import { onlineBlockers } from "@/server/services/agent-funding";
import { queryOne } from "@/server/db";

export const GET = apiHandler(async (req, { params, agencyId }) => {
  const { id } = await params;
  const agent = await agents.findByIdWithUser(id, agencyId ?? undefined);
  if (!agent) return fail("Agent not found", 404);
  return ok(agent);
}, { resource: "agents", action: "view" });

export const PATCH = apiHandler(async (req, { params, user, membership, agencyId, isHead }) => {
  const { id } = await params;
  // Phase 5: heads manage agents in their own agency (scoped update below);
  // platform admins keep matrix rights; everyone else is self-edit only.
  const canManage = Boolean(isHead || (user && hasPermission(user.role as any, "agents", "manage")));
  if (!canManage) {
    const agent = await queryOne<{ membership_id: string; approval_status: string }>(
      "SELECT membership_id, approval_status FROM app.agents WHERE id = $1", [id],
    );
    if (!agent || !membership || agent.membership_id !== membership.id) {
      return fail("You can only update your own agent profile", 403);
    }
    const body = validate(updateOwnAgentSchema, await req.json());
    if (body.availability === "available") {
      // Full server checklist (approval + funding + live campaigns +
      // endpoint). Mic+speaker stays client-side (per-browser localStorage,
      // enforced by the header/sidebar toggles before this call).
      const blockers = await onlineBlockers(id);
      if (blockers.length > 0) {
        return fail(`Cannot go online yet — missing: ${blockers.join("; ")}`, 422);
      }
    }
    const updated = await agents.update(id, body);
    return ok(updated, "Agent updated");
  }
  const body = validate(updateAgentSchema, await req.json());
  if (body.skills) {
    body.skills = await assertValidSkills(body.skills);
  }
  if ((body as { availability?: string }).availability === "available") {
    const blockers = await onlineBlockers(id);
    if (blockers.length > 0) {
      return fail(`Agent cannot go online — missing: ${blockers.join("; ")}`, 422);
    }
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
