import { apiHandler, ok } from "@/server/api-utils";
import { memberships } from "@/server/repositories";
import { validate, createMembershipSchema } from "@/server/validate";

export const runtime = "nodejs";

export const POST = apiHandler(async (req, context) => {
  const body = validate(createMembershipSchema, await req.json());
  const membership = await memberships.create({
    ...body,
    agency_id: context.agencyId ?? body.agency_id,
  });
  return ok(membership, "Member invited");
}, { resource: "users", action: "create" });
