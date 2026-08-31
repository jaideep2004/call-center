import { apiHandler, ok, created, paginated } from "@/server/api-utils";
import { campaigns, campaignAssignments } from "@/server/repositories";
import { validate, createCampaignSchema, paginationSchema, searchSchema, sortSchema } from "@/server/validate";
import { assertValidSkills } from "@/server/services/skills.service";

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { page, limit } = validate(paginationSchema, params);
  const { search } = validate(searchSchema, params);
  const { sortBy, order } = validate(sortSchema, params);
  const status = url.searchParams.get("status") ?? undefined;

  const { rows, pagination } = await campaigns.findMany({
    pagination: { page, limit: 100 },
    search,
    sortBy,
    order,
    agencyId: context.agencyId ?? undefined,
    status,
  });

  const role = context.user?.role ?? "agent";
  let visible = rows;
  if (!ADMIN_ROLES.has(role) && context.agencyId) {
    const assignedToMe = new Set(await campaignAssignments.findCampaignIdsForAgencyOrAgent(context.agencyId));
    const anyAssignments = new Set(await campaignAssignments.findAllAssignedCampaignIds());
    visible = rows.filter((c) => !anyAssignments.has(c.id) || assignedToMe.has(c.id));
  }

  return paginated(visible, pagination);
}, { resource: "settings", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = validate(createCampaignSchema, await req.json());
  body.required_skills = await assertValidSkills(body.required_skills);
  const campaign = await campaigns.create({ ...body, agency_id: context.agencyId ?? body.agency_id });
  return created(campaign);
}, { resource: "settings", action: "create" });
