import { apiHandler, ok, created, paginated } from "@/server/api-utils";
import { phoneNumbers, campaigns } from "@/server/repositories";
import { validate, createPhoneNumberSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return paginated([], { page: 1, limit: 25, total: 0, totalPages: 0 });
  const rows = await phoneNumbers.findByAgency(agencyId);
  return paginated(rows, { page: 1, limit: rows.length, total: rows.length, totalPages: 1 });
}, { resource: "settings", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok(null, "No agency found");
  const body = validate(createPhoneNumberSchema, await req.json());
  await campaigns.findById(body.campaign_id, agencyId);
  const number = await phoneNumbers.create({
    agency_id: agencyId,
    campaign_id: body.campaign_id,
    provider: body.provider,
    e164: body.number,
  });
  return created(number, "Phone number added");
}, { resource: "settings", action: "manage" });
