import { apiHandler, ok } from "@/server/api-utils";
import { recordings } from "@/server/repositories";

export const GET = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok([]);
  const url = new URL(req.url);
  const callId = url.searchParams.get("call_id");
  if (callId) {
    const row = await recordings.findByCallId(callId);
    return ok(row ? [row] : []);
  }
  const rows = await recordings.findByAgency(agencyId);
  return ok(rows);
}, { resource: "calls", action: "view" });
