import { apiHandler, ok, created, paginated } from "@/server/api-utils";
import { agents, memberships } from "@/server/repositories";
import { validate, createAgentSchema, paginationSchema, searchSchema, sortSchema } from "@/server/validate";
import { assertValidSkills } from "@/server/services/skills.service";

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { page, limit } = validate(paginationSchema, params);
  const { search } = validate(searchSchema, params);
  const { sortBy, order } = validate(sortSchema, params);
  const status = url.searchParams.get("status") ?? undefined;

  const { rows, pagination } = await agents.findMany({
    pagination: { page, limit },
    search,
    sortBy,
    order,
    agencyId: context.agencyId ?? undefined,
    status,
  });

  return paginated(rows, pagination);
}, { resource: "agents", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = validate(createAgentSchema, await req.json());
  const agencyId = context.agencyId ?? body.agency_id;

  // If user_id provided instead of membership_id, auto-create membership
  let membershipId = body.membership_id;
  if (!membershipId && body.user_id) {
    let membership = await memberships.findByUserAndAgency(body.user_id, agencyId);
    if (!membership) {
      membership = await memberships.create({
        agency_id: agencyId,
        user_id: body.user_id,
        role: "agent",
      });
    }
    membershipId = membership.id;
  }

  if (!membershipId) {
    return ok(null, "user_id or membership_id is required");
  }

  const agent = await agents.create({
    agency_id: agencyId,
    membership_id: membershipId,
    states: body.states,
    zip_prefixes: body.zip_prefixes,
    licenses: body.licenses,
    skills: await assertValidSkills(body.skills),
    npn: body.npn,
  });
  return created(agent);
}, { resource: "agents", action: "create" });
