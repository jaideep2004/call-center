import { apiHandler, ok, fail } from "@/server/api-utils";
import { recordings, agents, calls } from "@/server/repositories";

export const GET = apiHandler(async (req, context) => {
  const { id } = await context.params;
  const recording = await recordings.findById(id, context.agencyId ?? undefined);
  // Plain agents may open ONLY their own calls' recordings — including
  // unassigned ones (nobody's call is nobody's recording).
  if (context.user?.role !== "admin" && !context.isHead) {
    const me = context.membership ? await agents.findByMembershipId(context.membership.id).catch(() => null) : null;
    if (!me) return fail("Agent profile not found", 403);
    const call = await calls.findById(recording.call_id, context.agencyId ?? undefined).catch(() => null);
    if (!call || call.agent_id !== me.id) return fail("Recording not found", 404);
  }
  return ok(recording);
}, { resource: "calls", action: "view" });

export const DELETE = apiHandler(async (req, context) => {
  const { id } = await context.params;
  // Delete stays admin-only by intent (agents lack calls:manage and heads
  // have no allowHead here): recordings are billing evidence. GET/download
  // above carry the per-agent ownership checks instead.
  await recordings.delete(id, context.agencyId!);
  return ok(null, "Recording deleted");
}, { resource: "calls", action: "manage" });
