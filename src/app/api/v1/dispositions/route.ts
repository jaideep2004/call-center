import { apiHandler, ok, fail } from "@/server/api-utils";
import { dispositions, agents } from "@/server/repositories";

export const GET = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok([]);
  // Plain agents see ONLY their own dispositions (same rule as calls).
  let agentId: string | undefined;
  if (context.user?.role !== "admin" && !context.isHead) {
    const me = context.membership ? await agents.findByMembershipId(context.membership.id).catch(() => null) : null;
    if (!me) return fail("Agent profile not found", 403);
    agentId = me.id;
  }
  const url = new URL(req.url);
  const callId = url.searchParams.get("call_id");
  if (callId) {
    const row = await dispositions.findByCallIdForAgency(callId, agencyId, agentId);
    return ok(row ? [row] : []);
  }
  const status = url.searchParams.get("status");
  const rows = status === "pending"
    ? await dispositions.findPendingByAgency(agencyId, agentId)
    : await dispositions.findByAgency(agencyId, agentId);
  return ok(rows);
}, { resource: "calls", action: "view" });
