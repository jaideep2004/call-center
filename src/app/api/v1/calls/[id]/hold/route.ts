import { apiHandler, ok, fail } from "@/server/api-utils";
import { calls, agents } from "@/server/repositories";
import { hasPermission } from "@/server/services/permission-data";
import { query } from "@/server/db";

export const POST = apiHandler(async (req, context: any) => {
  const { id } = await context.params;
  const { agencyId, membership, user } = context;
  const canManage = Boolean(user && hasPermission(user.role as any, "calls", "manage"));
  const call = await calls.findById(id, agencyId ?? undefined).catch(() => null);
  if (!call) return fail("Call not found", 404);
  if (!canManage) {
    if (!membership) return fail("Agent membership required", 403);
    const agent = call.agent_id ? await agents.findById(call.agent_id).catch(() => null) : null;
    if (!agent || agent.membership_id !== membership.id) return fail("Not your call", 403);
  }
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "hold").toLowerCase();
  const wantHold = action === "hold" ? true : action === "unhold" ? false : null;
  if (wantHold === null) return fail("action must be hold or unhold", 400);

  // Try Telnyx hold/unhold if configured, otherwise simulate
  let simulated = false;
  try {
    const cid = (call as any).provider_agent_call_id ?? (call as any).provider_call_id;
    if (cid && process.env.TELNYX_API_KEY) {
      const { telnyxProvider } = await import("@/domain/providers/telnyx");
      // @ts-ignore optional hold
      const fn = wantHold ? (telnyxProvider as any).hold : (telnyxProvider as any).unhold;
      if (typeof fn === "function") await fn.call(telnyxProvider, { callId: cid });
      else simulated = true;
    } else simulated = true;
  } catch (e: any) {
    // do not block hold UX on provider error
    simulated = true;
  }
  try {
    await query(`INSERT INTO app.call_events (call_id, agency_id, type, payload) VALUES ($1,$2,$3,$4)`, [id, (call as any).agency_id, wantHold ? "hold" : "unhold", JSON.stringify({ by: membership?.id ?? user?.id ?? null })]);
  } catch {}
  return ok({ held: wantHold, simulated }, wantHold ? "Call held" : "Call resumed");
}, { resource: "calls", action: "update" });
