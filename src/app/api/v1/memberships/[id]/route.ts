import { apiHandler, ok } from "@/server/api-utils";
import { memberships } from "@/server/repositories";
import { validate, updateMembershipSchema } from "@/server/validate";

export const GET = apiHandler(async (req, { params, agencyId }) => {
  const { id } = await params;
  const membership = await memberships.findById(id, agencyId ?? undefined);
  return ok(membership);
}, { resource: "users", action: "view" });

export const PATCH = apiHandler(async (req, { params, agencyId }) => {
  const { id } = await params;
  const body = validate(updateMembershipSchema, await req.json());
  const membership = await memberships.update(id, body, agencyId ?? undefined);
  return ok(membership, "Membership updated");
}, { resource: "users", action: "update" });
