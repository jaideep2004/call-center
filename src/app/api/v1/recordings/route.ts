import { apiHandler, ok, fail } from "@/server/api-utils";
import { recordings, agents } from "@/server/repositories";

export const GET = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok([]);
  const url = new URL(req.url);
  const callId = url.searchParams.get("call_id");

  // Plain agents hear ONLY their own calls' recordings — teammates' calls
  // stay private. Heads/admins keep the agency view.
  if (context.user?.role !== "admin" && !context.isHead) {
    const me = context.membership ? await agents.findByMembershipId(context.membership.id).catch(() => null) : null;
    if (!me) return fail("Agent profile not found", 403);
    if (callId) {
      const row = await recordings.findByCallIdForAgent(callId, me.id);
      return ok(row ? [row] : []);
    }
    return ok(await recordings.findByAgent(agencyId, me.id));
  }

  if (callId) {
    const row = await recordings.findByCallId(callId);
    return ok(row ? [row] : []);
  }
  const rows = await recordings.findByAgency(agencyId);
  return ok(rows);
}, { resource: "calls", action: "view" });
