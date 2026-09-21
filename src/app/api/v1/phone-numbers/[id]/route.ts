import { apiHandler, ok, fail } from "@/server/api-utils";
import { phoneNumbers, campaigns } from "@/server/repositories";
import { validate, updatePhoneNumberSchema } from "@/server/validate";

export const runtime = "nodejs";

/**
 * PATCH /api/v1/phone-numbers/[id] — move a DID between campaigns, or
 * `{ campaign_id: null }` to park it as unassigned spare inventory (0051).
 * Unassigned DIDs match nothing (ping joins on campaign_id, deploy reads
 * findByCampaign), so they can never receive or route traffic.
 */
export const PATCH = apiHandler(async (req, context) => {
  const isAdmin = context.user?.role === "admin";
  // Admin operates cross-agency; heads are confined to their own agency.
  const agencyId = isAdmin ? undefined : (context.agencyId ?? undefined);
  if (!isAdmin && !agencyId) return fail("Agency required", 403);
  const { id } = await context.params;
  const body = validate(updatePhoneNumberSchema, await req.json());
  const number = await phoneNumbers.findById(id, agencyId).catch(() => null);
  if (!number) return fail("Phone number not found", 404);
  if (body.campaign_id) {
    const campaign = await campaigns.findById(body.campaign_id, agencyId).catch(() => null);
    if (!campaign) return fail("Campaign not found", 404);
  }
  const row = await phoneNumbers.reassign(id, body.campaign_id, number.agency_id);
  return ok(row, body.campaign_id ? "Number moved" : "Number unassigned");
}, { resource: "settings", action: "manage" });
