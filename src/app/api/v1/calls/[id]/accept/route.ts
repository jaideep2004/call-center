import { ForbiddenError } from "@/server/errors";
import { calls, agents } from "@/server/repositories";
import { apiHandler, fail, ok } from "@/server/api-utils";
import { acceptCall } from "@/server/services/call-orchestrator";

export const POST = apiHandler(async (req, context: any) => {
  const { id } = await context.params;
  const membership = context.membership;
  const call = await calls.findById(id);
  if (!call) return fail("Call not found", 404);
  const agent = call.agent_id ? await agents.findById(call.agent_id).catch(() => null) : null;
  if (!membership || !agent || agent.membership_id !== membership.id) throw new ForbiddenError("Not your call to accept");
  const result = await acceptCall(id);
  if (!result) return fail("Call could not be bridged (legs already gone)", 409);
  return ok(result);
}, { resource: "calls", action: "accept" });
