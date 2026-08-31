import { apiHandler, ok, fail } from "@/server/api-utils";
import { hangupCall } from "@/server/services/call-orchestrator";
import { calls, agents } from "@/server/repositories";
import { hasPermission } from "@/server/services/permission-data";

export const POST = apiHandler(async (req, context: any) => {
  const { id } = await context.params;
  const { user, membership, agencyId } = context;
  const canManage = Boolean(user && hasPermission(user.role as any, "calls", "manage"));

  const call = await calls.findById(id, agencyId ?? undefined).catch(() => null);
  if (!call) return fail("Call not found", 404);

  if (!canManage) {
    if (!membership) return fail("Agent membership required", 403);
    const agent = call.agent_id ? await agents.findById(call.agent_id).catch(() => null) : null;
    if (!agent || agent.membership_id !== membership.id) return fail("Not your call to hang up", 403);
  }

  const result = await hangupCall(id);
  return ok(result);
}, { resource: "calls", action: "update" });
