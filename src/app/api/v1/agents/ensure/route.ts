import { apiHandler, ok, created, fail } from "@/server/api-utils";
import { agents } from "@/server/repositories";
import { queryOne } from "@/server/db";

/**
 * POST /api/v1/agents/ensure — platform-admin-only backfill.
 * Signup creates the login ("user" row) but the agent profile row only
 * appears once the user opens the dashboard (auto-create) or Take Calls.
 * Agent-role users who never got that far (e.g. unverified email) are
 * invisible on the Agents page and can't be approved — this creates (or
 * adopts into the agency for invited users) the pending profile so the
 * normal approve flow works.
 */
export const POST = apiHandler(async (req) => {
  const body = await req.json().catch(() => ({} as { user_id?: unknown }));
  const userId = typeof body.user_id === "string" ? body.user_id : "";
  if (!userId) return fail("user_id is required", 400);

  const target = await queryOne<{ id: string; role: string | null }>(
    `SELECT id, role FROM "user" WHERE id = $1`,
    [userId],
  );
  if (!target) return fail("User not found", 404);

  const byUser = await agents.findByUserId(userId);
  if (byUser) return ok(byUser, "Agent profile already exists");

  const mem = await queryOne<{ id: string; agency_id: string }>(
    `SELECT id, agency_id FROM app.memberships WHERE user_id = $1 AND status = 'active' LIMIT 1`,
    [userId],
  );
  if (mem) {
    const { agent, adopted } = await agents.adoptOrCreate({
      agency_id: mem.agency_id,
      membership_id: mem.id,
      user_id: userId,
      endpoint_types: ["webrtc"],
    });
    return adopted
      ? ok(agent, "Pending signup profile adopted into the agency")
      : created(agent, "Agent profile created");
  }

  const row = await agents.create({
    agency_id: null,
    membership_id: null,
    user_id: userId,
    endpoint_types: ["webrtc"],
  });
  // Option A backfill: also place them in the platform home agency when
  // configured, so Create profile fully onboards solo agents.
  const { ensurePlatformMembership } = await import("@/server/services/platform-agency");
  const placed = await ensurePlatformMembership(row.id);
  return created(row, placed.joined
    ? "Agent profile created and joined to the platform agency — approve it on the Agents page"
    : "Pending agent profile created — approve it on the Agents page");
}, { resource: "agents", action: "create" });
