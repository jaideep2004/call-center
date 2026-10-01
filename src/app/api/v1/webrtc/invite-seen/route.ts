import { z } from "zod";
import { apiHandler, ok, fail } from "@/server/api-utils";
import { agents } from "@/server/repositories";
import { query } from "@/server/db";

const bodySchema = z.object({
  sdkCallId: z.string().min(1).max(128),
  state: z.string().max(64).nullable().optional(),
});

/**
 * POST /api/v1/webrtc/invite-seen — browser beacon fired on the first SIP
 * notification for an inbound leg. The server log line this produces is the
 * decisive discriminator for "no INVITE in tab" outages:
 *   beacon present  = Telnyx delivered the INVITE; fix the client handling.
 *   beacon absent   = INVITE never reached any live tab; fix delivery
 *                     (ghost contact / dial routing), not the client.
 * Also stamps the agent's currently-ringing calls so call detail shows it.
 */
export const POST = apiHandler(async (req, context) => {
  if (!context.membership?.id) return fail("No active membership", 403);
  const agent = await agents.findByMembershipId(context.membership.id).catch(() => null);
  if (!agent) return fail("Agent not found", 404);
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid beacon", 422);
  const { sdkCallId, state } = parsed.data;
  const stamped = await query<{ id: string }>(
    `UPDATE app.calls
        SET routing_snapshot = COALESCE(routing_snapshot, '{}'::jsonb) || $2::jsonb
      WHERE agent_id = $1 AND state = 'ringing'
      RETURNING id`,
    [agent.id, JSON.stringify({ invite_seen_at: new Date().toISOString(), sdk_leg: sdkCallId.slice(0, 32) })],
  ).catch(() => [] as { id: string }[]);
  console.log(`[invite] agent=${agent.id.slice(0, 8)} SAW invite leg=${sdkCallId.slice(0, 12)} state=${state ?? "?"} ringingCalls=${stamped.length}`);
  return ok({ stamped: stamped.length });
}, { resource: "calls", action: "view" });
