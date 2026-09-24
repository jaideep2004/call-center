import { apiHandler, ok, created, paginated, fail } from "@/server/api-utils";
import { campaigns, campaignAssignments } from "@/server/repositories";
import { validate, createCampaignSchema, paginationSchema, searchSchema, sortSchema } from "@/server/validate";
import { assertValidSkills } from "@/server/services/skills.service";

const ADMIN_ROLES = new Set(["admin"]);

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { page, limit } = validate(paginationSchema, params);
  const { search } = validate(searchSchema, params);
  const { sortBy, order } = validate(sortSchema, params);
  const status = url.searchParams.get("status") ?? undefined;

  // Platform admin sees every agency's campaigns; everyone else is confined
  // to their own agency (and fails closed without one).
  const isAdmin = ADMIN_ROLES.has(context.user?.role ?? "");
  const scopeAgency = isAdmin ? undefined : (context.agencyId ?? undefined);
  if (!isAdmin && !scopeAgency) return fail("Agency scope required", 403);

  const { rows, total } = await campaigns.findManyWithBid({
    agencyId: scopeAgency,
    status,
    search,
    sortBy,
    order,
    limit,
    offset: (page - 1) * limit,
  });
  const pagination = { page, limit, total, totalPages: Math.ceil(total / limit) };

  const role = context.user?.role ?? "agent";
  let visible = rows;
  if (!ADMIN_ROLES.has(role) && context.agencyId) {
    const assignedToMe = new Set(await campaignAssignments.findCampaignIdsForAgencyOrAgent(context.agencyId));
    const anyAssignments = new Set(await campaignAssignments.findAllAssignedCampaignIds());
    visible = rows.filter((c) => !anyAssignments.has(c.id) || assignedToMe.has(c.id));
  }

  // Phase 4 (point 2): publisher payouts are admin-only. Agents reach this
  // endpoint via the Browse fallback, so strip for every non-admin role.
  // Admins keep full rows (Bidding tab edits max payout live).
  if (!ADMIN_ROLES.has(role)) {
    visible = visible.map((c) => {
      const {
        effective_payout_cents: _s1,
        effective_max_payout_cents: _s2,
        max_publisher_payout_cents: _s3,
        min_publisher_payout_cents: _s4,
        ...payoutFree
      } = c as unknown as Record<string, unknown>;
      void _s1; void _s2; void _s3; void _s4;
      return payoutFree as unknown as typeof c;
    });
  }

  return paginated(visible, pagination);
}, { resource: "settings", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = validate(createCampaignSchema, await req.json());
  body.required_skills = await assertValidSkills(body.required_skills);
  // Normalize publisher_ids (client sends publisher_ids for multi-select; fallback to single publisher_id)
  const publisherIds: string[] | undefined = (body as any).publisher_ids ?? (body.publisher_id ? [body.publisher_id] : undefined);
  const payload: Record<string, unknown> = { ...body, agency_id: context.agencyId ?? body.agency_id };
  if (publisherIds !== undefined) {
    payload.publisher_ids = publisherIds;
    delete (payload as any).publisher_id;
  }
  const campaign = await campaigns.create(payload as any);
  return created(campaign);
}, { resource: "settings", action: "create" });
