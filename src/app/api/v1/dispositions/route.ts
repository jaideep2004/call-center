import { apiHandler, ok } from "@/server/api-utils";
import { dispositions } from "@/server/repositories";

export const GET = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok([]);
  const url = new URL(req.url);
  const callId = url.searchParams.get("call_id");
  if (callId) {
    const row = await dispositions.findByCallIdForAgency(callId, agencyId);
    return ok(row ? [row] : []);
  }
  const status = url.searchParams.get("status");
  const rows = status === "pending"
    ? await dispositions.findPendingByAgency(agencyId)
    : await dispositions.findByAgency(agencyId);
  return ok(rows);
}, { resource: "calls", action: "view" });
