import { apiHandler, ok, fail } from "@/server/api-utils";
import { calls, agents } from "@/server/repositories";
import { hasPermission } from "@/server/services/permission-data";
import { listNotes, createNote } from "@/server/repositories/call-notes";

export const GET = apiHandler(async (_req, context: any) => {
  const { id } = await context.params;
  const { agencyId, user, membership } = context;
  const canManage = Boolean(user && hasPermission(user.role as any, "calls", "manage"));
  const call = await calls.findById(id, agencyId ?? undefined).catch(() => null);
  if (!call) return fail("Call not found", 404);
  if (!canManage) {
    if (!membership) return fail("Agent membership required", 403);
    const agent = call.agent_id ? await agents.findById(call.agent_id).catch(() => null) : null;
    if (!agent || agent.membership_id !== membership.id) {
      // allow viewing notes only for own call; admin passes
      return fail("Not your call", 403);
    }
  }
  const rows = await listNotes(id, agencyId ?? undefined);
  return ok(rows);
}, { resource: "calls", action: "view" });

export const POST = apiHandler(async (req, context: any) => {
  const { id } = await context.params;
  const { agencyId, membership, user } = context;
  const canManage = Boolean(user && hasPermission(user.role as any, "calls", "manage"));
  const call = await calls.findById(id, agencyId ?? undefined).catch(() => null);
  if (!call) return fail("Call not found", 404);

  let agentId: string | null = null;
  if (!canManage) {
    if (!membership) return fail("Agent membership required", 403);
    const agent = await agents.findByMembershipId(membership.id).catch(() => null);
    if (!agent) return fail("Agent not found", 404);
    if (call.agent_id && call.agent_id !== agent.id) return fail("Not your call", 403);
    agentId = agent.id;
  } else if (membership) {
    const agent = await agents.findByMembershipId(membership.id).catch(() => null);
    agentId = agent?.id ?? null;
  }

  const body = await req.json().catch(() => ({}));
  const text = String(body?.body ?? body?.notes ?? "").trim();
  if (!text) return fail("Note body required", 400);
  if (text.length > 2000) return fail("Note too long (max 2000)", 400);

  const row = await createNote({ call_id: id, agent_id: agentId, agency_id: (agencyId as string) ?? call.agency_id, body: text });
  return ok(row, "Note saved");
}, { resource: "calls", action: "update" });
