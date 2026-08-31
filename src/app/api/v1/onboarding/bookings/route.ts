import { apiHandler, ok, fail, created } from "@/server/api-utils";
import { query, queryOne } from "@/server/db";
import { agents } from "@/server/repositories";

function isAdmin(user: any) { return user && (user.role === "admin" || user.role === "super_admin"); }

// GET /api/v1/onboarding/bookings — admin sees all, agent sees own
export const GET = apiHandler(async (req, context: any) => {
  const { agencyId, user, membership } = context;
  const url = new URL(req.url);
  const slotId = url.searchParams.get("slot_id");
  if (isAdmin(user)) {
    const params: unknown[] = [];
    let where = "";
    if (agencyId) { where = `WHERE b.agency_id = $1 OR b.agency_id IS NULL`; params.push(agencyId); }
    if (slotId) {
      const idx = params.length + 1;
      where = where ? `${where} AND b.slot_id = $${idx}` : `WHERE b.slot_id = $${idx}`;
      params.push(slotId);
    }
    const rows = await query<any>(`SELECT b.*, s.date, s.start_time, s.end_time, s.capacity FROM app.onboarding_bookings b JOIN app.onboarding_slots s ON s.id = b.slot_id ${where} ORDER BY b.created_at DESC`, params);
    return ok(rows);
  }
  // agent
  if (!membership) return fail("Membership required", 403);
  const agent = await agents.findByMembershipId(membership.id).catch(() => null);
  if (!agent) return fail("Agent not found — complete your agent profile first", 404);
  const rows = await query<any>(`SELECT b.*, s.date, s.start_time, s.end_time FROM app.onboarding_bookings b JOIN app.onboarding_slots s ON s.id = b.slot_id WHERE b.agent_id = $1 ORDER BY s.date ASC, s.start_time ASC`, [agent.id]);
  return ok(rows);
}, { resource: "settings", action: "view" });

// POST /api/v1/onboarding/bookings { slot_id }
export const POST = apiHandler(async (req, context: any) => {
  const { agencyId, membership } = context;
  if (!membership) return fail("Membership required", 403);
  const agent = await agents.findByMembershipId(membership.id).catch(() => null);
  if (!agent) return fail("Agent not found — ask admin to invite your agent profile", 404);
  const body = await req.json().catch(() => ({}));
  const slot_id = String(body.slot_id ?? "").trim();
  if (!slot_id) return fail("slot_id required", 400);
  const slot = await queryOne<any>(`SELECT * FROM app.onboarding_slots WHERE id = $1`, [slot_id]);
  if (!slot) return fail("Slot not found", 404);
  if (!slot.is_active) return fail("Slot is not active", 409);
  // check capacity
  const booked = await queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM app.onboarding_bookings WHERE slot_id = $1 AND status != 'cancelled'`, [slot_id]);
  if (Number(booked?.count ?? 0) >= slot.capacity) return fail("Slot is fully booked", 409);
  // check already booked same slot
  const existing = await queryOne<any>(`SELECT id FROM app.onboarding_bookings WHERE slot_id = $1 AND agent_id = $2`, [slot_id, agent.id]);
  if (existing) return fail("You already booked this slot", 409);
  // optionally limit one pending/confirmed booking per agent
  // create
  const row = await queryOne<any>(
    `INSERT INTO app.onboarding_bookings (slot_id, agent_id, agency_id, status) VALUES ($1,$2,$3,'pending') RETURNING *`,
    [slot_id, agent.id, agencyId ?? agent.agency_id ?? null],
  );
  // Also create notification via outbox? simple toast only for now
  return created(row, "Booking created — admin will confirm");
}, { resource: "settings", action: "view" });
