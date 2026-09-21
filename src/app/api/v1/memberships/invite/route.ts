import { apiHandler, ok, fail, requireHeadOr } from "@/server/api-utils";
import { memberships } from "@/server/repositories";
import { validate, createMembershipSchema } from "@/server/validate";
import { sendMemberAdded } from "@/server/services/action-emails";

export const runtime = "nodejs";

export const POST = apiHandler(async (req, context) => {
  requireHeadOr(context, "users", "create");
  const body = validate(createMembershipSchema, await req.json());
  // Heads invite agents only — minting tenant admins is a platform action.
  if (context.isHead && body.role !== "agent") {
    return fail("Agency heads can only invite agents", 403);
  }
  const membership = await memberships.create({
    ...body,
    agency_id: context.agencyId ?? body.agency_id,
  });
  // Best-effort welcome email + inbox row (never blocks the invite).
  void sendMemberAdded({ agencyId: membership.agency_id, userId: body.user_id });
  return ok(membership, "Member invited");
}, { resource: "users", action: "create", allowHead: true });
