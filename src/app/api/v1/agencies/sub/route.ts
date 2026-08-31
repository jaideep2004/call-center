import { apiHandler, created, fail } from "@/server/api-utils";
import { agencies, memberships } from "@/server/repositories";
import { validate, createSubAgencySchema } from "@/server/validate";

export const POST = apiHandler(async (req, { membership, agencyId }) => {
  if (!membership) return fail("Membership required", 403);
  const body = validate(createSubAgencySchema, await req.json());

  if (!agencyId) return fail("Parent agency not found", 404);
  const parent = await agencies.findById(agencyId);
  if (!parent) return fail("Parent agency not found", 404);

  const existing = await agencies.findBySlug(body.slug).catch(() => null);
  if (existing) return fail("An agency with this slug already exists", 409);

  const sub = await agencies.create({
    name: body.name,
    slug: body.slug,
    parent_agency_id: agencyId,
    commission_rate: body.commission_rate,
  });

  await memberships.create({
    agency_id: sub.id,
    user_id: membership.id,
    role: "admin",
  });

  return created(sub, "Sub-agency created");
}, { resource: "agency", action: "manage" });
