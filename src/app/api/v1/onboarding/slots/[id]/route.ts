import { apiHandler, ok, fail } from "@/server/api-utils";
import { queryOne, query } from "@/server/db";

function isAdmin(user: any) { return user && (user.role === "admin" || user.role === "super_admin"); }

export const PATCH = apiHandler(async (req, context: any) => {
  const { id } = await context.params;
  const { user } = context;
  if (!isAdmin(user)) return fail("Admin only", 403);
  const body = await req.json().catch(() => ({}));
  const updates: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (body.date !== undefined) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.date))) return fail("invalid date", 400); updates.push(`date = $${idx++}`); params.push(body.date); }
  if (body.start_time !== undefined) { updates.push(`start_time = $${idx++}`); params.push(body.start_time); }
  if (body.end_time !== undefined) { updates.push(`end_time = $${idx++}`); params.push(body.end_time); }
  if (body.capacity !== undefined) {
    const c = Number(body.capacity);
    if (!Number.isFinite(c) || c < 1 || c > 100) return fail("capacity 1..100", 400);
    updates.push(`capacity = $${idx++}`); params.push(c);
  }
  if (body.is_active !== undefined) { updates.push(`is_active = $${idx++}`); params.push(Boolean(body.is_active)); }
  if (updates.length === 0) return fail("No fields to update", 400);
  params.push(id);
  const row = await queryOne<any>(`UPDATE app.onboarding_slots SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`, params);
  if (!row) return fail("Slot not found", 404);
  return ok(row, "Slot updated");
}, { resource: "settings", action: "manage" });

export const DELETE = apiHandler(async (_req, context: any) => {
  const { id } = await context.params;
  const { user } = context;
  if (!isAdmin(user)) return fail("Admin only", 403);
  // check has bookings
  const bookings = await query<any>(`SELECT id FROM app.onboarding_bookings WHERE slot_id = $1 AND status != 'cancelled'`, [id]);
  if (bookings.length > 0) return fail("Cannot delete slot with active bookings — deactivate instead", 409);
  await query(`DELETE FROM app.onboarding_slots WHERE id = $1`, [id]);
  return ok({ id }, "Slot deleted");
}, { resource: "settings", action: "manage" });
