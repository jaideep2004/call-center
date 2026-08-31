import { apiHandler, ok, fail } from "@/server/api-utils";
import { queryOne } from "@/server/db";

function isAdmin(user: any) { return user && (user.role === "admin" || user.role === "super_admin"); }

export const PATCH = apiHandler(async (req, context: any) => {
  const { id } = await context.params;
  const { user } = context;
  if (!isAdmin(user)) return fail("Admin only", 403);
  const body = await req.json().catch(() => ({}));
  const status = String(body.status ?? "").trim();
  if (!["pending","confirmed","cancelled"].includes(status)) return fail("status must be pending|confirmed|cancelled", 400);
  const row = await queryOne<any>(`UPDATE app.onboarding_bookings SET status = $1 WHERE id = $2 RETURNING *`, [status, id]);
  if (!row) return fail("Booking not found", 404);
  return ok(row, `Booking ${status}`);
}, { resource: "settings", action: "manage" });

export const DELETE = apiHandler(async (_req, context: any) => {
  const { id } = await context.params;
  const { user, membership } = context;
  if (isAdmin(user)) {
    await queryOne(`DELETE FROM app.onboarding_bookings WHERE id = $1`, [id]);
    return ok({ id }, "Booking deleted");
  }
  // agent can cancel own booking
  if (!membership) return fail("Membership required", 403);
  const row = await queryOne<any>(`SELECT b.agent_id FROM app.onboarding_bookings b JOIN app.agents a ON a.id = b.agent_id WHERE b.id = $1`, [id]);
  if (!row) return fail("Booking not found", 404);
  // need to verify agent owns booking
  const { agents } = await import("@/server/repositories");
  const agent = await agents.findByMembershipId(membership.id).catch(() => null);
  if (!agent || agent.id !== row.agent_id) return fail("Not your booking", 403);
  await queryOne(`UPDATE app.onboarding_bookings SET status = 'cancelled' WHERE id = $1`, [id]);
  return ok({ id }, "Booking cancelled");
}, { resource: "settings", action: "view" });
