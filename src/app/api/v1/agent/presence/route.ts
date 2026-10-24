import { apiHandler, ok, fail } from "@/server/api-utils";
import { agents } from "@/server/repositories";

export const runtime = "nodejs";

/**
 * POST /api/v1/agent/presence — dashboard heartbeat.
 *
 * Refreshes presence_seen_at for the caller's own agent row while it is
 * `available`. The server only trusts a stamp newer than PRESENCE_TTL_SECONDS,
 * so a killed tab / lost network / sleeping laptop ages out instead of being
 * reported online forever. Offline rows are never revived here; going online
 * still goes through the funding + device gates.
 */
export const POST = apiHandler(async (_req, context) => {
  if (!context.membership?.id) return fail("Agent profile not found", 404);
  const online = await agents.touchPresence(context.membership.id);
  return ok({ online });
}, { resource: "agents", action: "view" });
