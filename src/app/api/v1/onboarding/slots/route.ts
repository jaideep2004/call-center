import { apiHandler, ok, fail, created } from "@/server/api-utils";
import { query, queryOne } from "@/server/db";
import { hasPermission } from "@/server/services/permission-data";

function isAdmin(user: any) {
  return user && (user.role === "admin" || user.role === "super_admin");
}

// GET /api/v1/onboarding/slots — list slots (agent sees only active future, admin sees all)
export const GET = apiHandler(async (req, context: any) => {
  const { agencyId, user } = context;
  const url = new URL(req.url);
  const activeOnly = url.searchParams.get("active");
  const date = url.searchParams.get("date");
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  // scope to agency when present, but allow global slots too (agency_id IS NULL)
  if (agencyId) {
    conditions.push(`(agency_id = $${idx} OR agency_id IS NULL)`);
    params.push(agencyId);
    idx++;
  }
  if (!isAdmin(user) || activeOnly === "true") {
    conditions.push(`is_active = true`);
    conditions.push(`date >= CURRENT_DATE`);
  }
  if (date) {
    conditions.push(`date = $${idx}`);
    params.push(date);
    idx++;
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await query<any>(`SELECT s.*, (SELECT COUNT(*)::int FROM app.onboarding_bookings b WHERE b.slot_id = s.id AND b.status != 'cancelled') as booked_count FROM app.onboarding_slots s ${where} ORDER BY date ASC, start_time ASC`, params);
  return ok(rows);
}, { resource: "settings", action: "view" });

// POST /api/v1/onboarding/slots — admin creates slot
export const POST = apiHandler(async (req, context: any) => {
  const { agencyId, user, membership } = context;
  if (!isAdmin(user)) return fail("Admin only", 403);
  const body = await req.json().catch(() => ({}));
  const date = String(body.date ?? "").trim();
  const start_time = String(body.start_time ?? body.startTime ?? "").trim();
  const end_time = String(body.end_time ?? body.endTime ?? "").trim();
  const capacity = Number(body.capacity ?? 1);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("date required (YYYY-MM-DD)", 400);
  if (!start_time || !/^\d{2}:\d{2}(:\d{2})?$/.test(start_time)) return fail("start_time required (HH:MM)", 400);
  if (!end_time || !/^\d{2}:\d{2}(:\d{2})?$/.test(end_time)) return fail("end_time required (HH:MM)", 400);
  if (!Number.isFinite(capacity) || capacity < 1 || capacity > 100) return fail("capacity 1..100", 400);
  if (start_time >= end_time) return fail("end_time must be after start_time", 400);
  const agency_id = agencyId ?? null;
  const row = await queryOne<any>(
    `INSERT INTO app.onboarding_slots (agency_id, date, start_time, end_time, capacity, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [agency_id, date, start_time, end_time, capacity, membership?.id ?? null],
  );
  return created(row, "Slot created");
}, { resource: "settings", action: "manage" });
