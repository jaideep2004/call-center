import { apiHandler, ok, noContent } from "@/server/api-utils";
import { leads, agents } from "@/server/repositories";
import { notify } from "@/server/services/notify";
import { ForbiddenError } from "@/server/errors";
import { validate, updateLeadSchema } from "@/server/validate";

const PLATFORM_ROLES = ["admin"];

function scopeFor(context: { agencyId?: string | null; user?: { role?: string } }): string | undefined {
  const scope = context.agencyId ?? undefined;
  if (!scope && !PLATFORM_ROLES.includes(context.user?.role ?? "")) {
    throw new ForbiddenError("Agency scope required");
  }
  return scope;
}

export const GET = apiHandler(async (req, { params, agencyId, user }) => {
  const { id } = await params;
  const lead = await leads.findById(id, scopeFor({ agencyId, user }));
  return ok(lead);
}, { resource: "leads", action: "view" });

export const PATCH = apiHandler(async (req, { params, agencyId, user }) => {
  const { id } = await params;
  const body = validate(updateLeadSchema, await req.json());
  const scope = scopeFor({ agencyId, user });
  // Read-before-write only when an assignment is requested, so the inbox
  // fires exactly on assignee change (not on every lead edit).
  const prev = body.assigned_agent_id !== undefined
    ? await leads.findById(id, scope).catch(() => null)
    : null;
  const lead = await leads.update(id, body, scope);
  if (body.assigned_agent_id && body.assigned_agent_id !== prev?.assigned_agent_id) {
    // Best-effort (notify() never throws): agency inbox + live badge + email
    // copy to the assigned agent's login.
    const assignee = await agents.findByIdWithUser(body.assigned_agent_id, scope).catch(() => null);
    await notify({
      agencyId: scope ?? null,
      topic: "lead.assigned",
      payload: {
        message: `Lead assigned to an agent`,
        lead_id: lead.id,
        assigned_agent_id: body.assigned_agent_id,
        href: `/dashboard/leads/${lead.id}`,
      },
      emailTo: assignee?.user_email ?? null,
      emailSubject: "A lead was assigned to you — Coverage Calls",
    });
  }
  return ok(lead, "Lead updated");
}, { resource: "leads", action: "update" });

export const DELETE = apiHandler(async (req, { params, agencyId, user }) => {
  const { id } = await params;
  await leads.softDelete(id, scopeFor({ agencyId, user }));
  return noContent();
}, { resource: "leads", action: "delete" });
