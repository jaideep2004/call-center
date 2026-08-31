import { apiHandler, ok, created } from "@/server/api-utils";
import { validate, createRtbReservationSchema } from "@/server/validate";
import { rtbReservations } from "@/server/repositories";
import { reserveRtbReservation } from "@/server/services/retreaver-rtb";

export const GET = apiHandler(async (req) => {
  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaign_id");
  if (!campaignId) return ok([]);
  const rows = await rtbReservations.findByCampaign(campaignId);
  return ok(rows);
}, { resource: "publishers", action: "view" });

export const POST = apiHandler(async (req) => {
  const body = validate(createRtbReservationSchema, await req.json());
  const row = await reserveRtbReservation({
    campaignId: body.campaign_id,
    callerNumber: body.caller_number,
    tags: body.tags,
  });
  return created(row, "RTB reservation created");
}, { resource: "publishers", action: "manage" });
