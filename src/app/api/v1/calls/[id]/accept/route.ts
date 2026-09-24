import { ForbiddenError } from "@/server/errors";
import { calls, agents } from "@/server/repositories";
import { apiHandler, fail, ok } from "@/server/api-utils";
import { acceptCall } from "@/server/services/call-orchestrator";

// Bridging can take seconds (late pickup wait loop) — the HTTP request must
// NOT hold that long or the softphone freezes on "connecting" with no
// Reject available. Accept returns 202 immediately; the outcome (connected /
// missed) arrives over the existing call:connected / call:ended socket
// events. The in-flight guard stops double-clicks from spawning twin loops.
const bridgingInFlight = new Set<string>();

export const POST = apiHandler(async (req, context: any) => {
  const { id } = await context.params;
  const membership = context.membership;
  const call = await calls.findById(id);
  if (!call) return fail("Call not found", 404);
  const agent = call.agent_id ? await agents.findById(call.agent_id).catch(() => null) : null;
  if (!membership || !agent || agent.membership_id !== membership.id) throw new ForbiddenError("Not your call to accept");
  if (call.state !== "ringing") return fail(`Call is no longer ringing (state: ${call.state})`, 409);
  if (!bridgingInFlight.has(id)) {
    bridgingInFlight.add(id);
    void acceptCall(id)
      .catch((e: unknown) => console.error(`[accept] background bridge failed for ${id.slice(0, 8)}:`, String(e).slice(0, 200)))
      .finally(() => bridgingInFlight.delete(id));
  }
  return ok({ accepted: true, call_id: id }, "Bridging — watch for the connected event");
}, { resource: "calls", action: "accept" });
