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
  const digits = String(body?.digits ?? body?.dtmf ?? "").trim();
  if (!digits) return fail("digits required", 400);
  if (!/^[0-9*#a-dA-D]+$/.test(digits)) return fail("digits must be 0-9 * # A-D", 400);

  let simulated = false;
  try {
    const cid = (call as any).provider_agent_call_id ?? (call as any).provider_call_id;
    if (cid && process.env.TELNYX_API_KEY) {
      const { telnyxProvider } = await import("@/domain/providers/telnyx");
      // @ts-ignore optional dtmf
      const fn = (telnyxProvider as any).sendDTMF;
      if (typeof fn === "function") await fn.call(telnyxProvider, { callId: cid, digits });
      else simulated = true;
    } else simulated = true;
  } catch { simulated = true; }
  try {
    await query(`INSERT INTO app.call_events (call_id, agency_id, type, payload) VALUES ($1,$2,$3,$4)`, [id, (call as any).agency_id, "dtmf", JSON.stringify({ digits, by: membership?.id ?? user?.id ?? null })]);
  } catch {}
  return ok({ digits, simulated }, "DTMF sent");
}, { resource: "calls", action: "update" });
