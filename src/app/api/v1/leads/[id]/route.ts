import { apiHandler, ok, noContent } from "@/server/api-utils";
import { leads } from "@/server/repositories";
import { ForbiddenError } from "@/server/errors";
import { validate, updateLeadSchema } from "@/server/validate";

const PLATFORM_ROLES = ["super_admin", "admin"];

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
  const lead = await leads.update(id, body, scopeFor({ agencyId, user }));
  return ok(lead, "Lead updated");
}, { resource: "leads", action: "update" });

export const DELETE = apiHandler(async (req, { params, agencyId, user }) => {
  const { id } = await params;
  await leads.softDelete(id, scopeFor({ agencyId, user }));
  return noContent();
}, { resource: "leads", action: "delete" });
