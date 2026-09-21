import { apiHandler, ok, fail, requireHeadOr } from "@/server/api-utils";
import { memberships } from "@/server/repositories";
import { validate, updateMembershipSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  requireHeadOr(context, "users", "view");
  const { id } = await context.params;
  const membership = await memberships.findById(id, context.agencyId ?? undefined);
  return ok(membership);
});

export const PATCH = apiHandler(async (req, context) => {
  requireHeadOr(context, "users", "update");
  const { id } = await context.params;
  const agencyId = context.agencyId;
  const body = validate(updateMembershipSchema, await req.json());
  // Heads manage their own members only (base update scopes by agencyId);
  // promoting to admin stays platform-only like invites.
  if (context.isHead && body.role !== undefined && body.role !== "agent") {
    return fail("Agency heads can only manage agent memberships", 403);
  }
  const membership = await memberships.update(id, body, agencyId ?? undefined);
  return ok(membership, "Membership updated");
}, { resource: "users", action: "update", allowHead: true });
