import { apiHandler, ok, created, paginated, fail } from "@/server/api-utils";
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
  // One number = one campaign: re-adding an assigned number 500d on the
  // unique index with no explanation. Name its current home instead so the
  // user moves it (list below / campaign page) rather than re-adding.
  const existing = await phoneNumbers.findByE164AnyStatus(body.number).catch(() => null);
  if (existing) {
    if (existing.agency_id !== agencyId) {
      return fail("This number is already assigned to another agency", 409);
    }
    if (!existing.campaign_id) {
      // Spare-pool number being claimed: assign in place instead of 409.
      const claimed = await phoneNumbers.update(existing.id, { campaign_id: body.campaign_id }, agencyId);
      return created(claimed, "Spare number assigned to this campaign");
    }
    const home = await campaigns.findById(existing.campaign_id, agencyId).catch(() => null);
    return fail(
      `This number is already on campaign '${home?.name ?? existing.campaign_id.slice(0, 8)}' — move it from the list instead of adding it again`,
      409,
    );
  }
  try {
    const number = await phoneNumbers.create({
      agency_id: agencyId,
      campaign_id: body.campaign_id,
      provider: body.provider,
      e164: body.number,
    });
    return created(number, "Phone number added");
  } catch (e: unknown) {
    // Lost a concurrent add race: re-read so the message names the home.
    if ((e as { code?: string })?.code !== "23505") throw e;
    const raced = await phoneNumbers.findByE164AnyStatus(body.number).catch(() => null);
    const home = raced?.campaign_id ? await campaigns.findById(raced.campaign_id, agencyId).catch(() => null) : null;
    return fail(
      raced
        ? `This number is already on campaign '${home?.name ?? raced.campaign_id?.slice(0, 8) ?? "spare pool"}' — move it from the list instead of adding it again`
        : "This number was just added by someone else — refresh the list",
      409,
    );
  }
}, { resource: "settings", action: "manage" });
