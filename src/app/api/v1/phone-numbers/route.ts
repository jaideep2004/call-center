import { apiHandler, ok, created, paginated } from "@/server/api-utils";
import { phoneNumbers, campaigns } from "@/server/repositories";
import { validate, createPhoneNumberSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const isAdmin = context.user?.role === "admin";
  const campaignId = new URL(req.url).searchParams.get("campaign_id") ?? undefined;
  if (campaignId) {
    // Per-campaign manager (campaign detail page): admin sees all, heads see own.
    const rows = await phoneNumbers.findAllByCampaign(campaignId, isAdmin ? undefined : context.agencyId ?? undefined);
    return paginated(rows, { page: 1, limit: rows.length, total: rows.length, totalPages: 1 });
  }
  if (isAdmin) {
    const rows = await phoneNumbers.findAll();
    return paginated(rows, { page: 1, limit: rows.length, total: rows.length, totalPages: 1 });
  }
  const agencyId = context.agencyId;
  if (!agencyId) return paginated([], { page: 1, limit: 25, total: 0, totalPages: 1 });
  const rows = await phoneNumbers.findByAgency(agencyId);
  return paginated(rows, { page: 1, limit: rows.length, total: rows.length, totalPages: 1 });
}, { resource: "settings", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const isAdmin = context.user?.role === "admin";
  const body = validate(createPhoneNumberSchema, await req.json());
  // Admin may target any agency (per-campaign add); everyone else uses their own.
  const agencyId = isAdmin ? (body.agency_id ?? context.agencyId) : context.agencyId;
  if (!agencyId) return ok(null, "No agency found");
  await campaigns.findById(body.campaign_id, agencyId);
  const number = await phoneNumbers.create({
    agency_id: agencyId,
    campaign_id: body.campaign_id,
    provider: body.provider,
    e164: body.number,
  });
  return created(number, "Phone number added");
}, { resource: "settings", action: "manage" });
