import { apiHandler, ok } from "@/server/api-utils";
import { retreaverCalls } from "@/server/repositories";

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const publisherId = url.searchParams.get("publisher_id");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const agencyId = context.agencyId;
  if (!agencyId) return ok([]);

  if (publisherId) {
    const rows = await retreaverCalls.findByPublisher(publisherId, limit);
    return ok(rows);
  }
  const rows = await retreaverCalls.findByAgency(agencyId, limit);
  return ok(rows);
}, { resource: "publishers", action: "view" });
