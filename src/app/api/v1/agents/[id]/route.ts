import { apiHandler, ok, noContent, fail } from "@/server/api-utils";
import { agents } from "@/server/repositories";
import { validate, updateAgentSchema, updateOwnAgentSchema } from "@/server/validate";
import { hasPermission } from "@/server/services/permission-data";
import { assertValidSkills } from "@/server/services/skills.service";
import { queryOne } from "@/server/db";

export const GET = apiHandler(async (req, { params }) => {
  const { id } = await params;
  const agent = await agents.findByIdWithUser(id);
  return ok(agent);
}, { resource: "agents", action: "view" });

export const PATCH = apiHandler(async (req, { params, user, membership, agencyId }) => {
  const { id } = await params;
  const canManage = Boolean(user && hasPermission(user.role as any, "agents", "manage"));
  if (!canManage) {
    const agent = await queryOne<{ membership_id: string }>("SELECT membership_id FROM app.agents WHERE id = $1", [id]);
    if (!agent || !membership || agent.membership_id !== membership.id) {
      return fail("You can only update your own agent profile", 403);
    }
    const body = validate(updateOwnAgentSchema, await req.json());
    const updated = await agents.update(id, body);
    return ok(updated, "Agent updated");
  }
  const body = validate(updateAgentSchema, await req.json());
  if (body.skills) {
    body.skills = await assertValidSkills(body.skills);
  }
  const agent = await agents.update(id, body, agencyId ?? undefined);
  return ok(agent, "Agent updated");
}, { resource: "agents", action: "update" });

export const DELETE = apiHandler(async (req, { params, agencyId, user }) => {
  const { id } = await params;
  const scope = agencyId ?? undefined;
  if (!scope && !["super_admin", "admin"].includes(user?.role ?? "")) {
    return fail("Agency scope required", 403);
  }
  await agents.softDelete(id, scope);
  return noContent();
}, { resource: "agents", action: "delete" });
