import { apiHandler, ok } from "@/server/api-utils";
import { query } from "@/server/db";
import { z } from "zod";
import { validate } from "@/server/validate";

const callsVolumeQuerySchema = z.object({ days: z.coerce.number().int().positive().default(30) });

export const GET = apiHandler(async (req) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { days } = validate(callsVolumeQuerySchema, params);

  // Event date is COALESCE(started_at, ended_at): missed/failed calls never
  // get a started_at, and filtering on started_at alone made them invisible
  // (empty chart on systems full of test misses). Real per-state breakdowns
  // replace the old UI-side ratio estimates.
  const rows = await query<{ date: string; count: number; connected: number; missed: number; failed: number }>(`
    SELECT DATE(COALESCE(started_at, ended_at)) as date,
           COUNT(*)::int as count,
           COUNT(*) FILTER (WHERE state = 'connected' OR state = 'ended')::int as connected,
           COUNT(*) FILTER (WHERE state = 'missed')::int as missed,
           COUNT(*) FILTER (WHERE state IN ('failed', 'cancelled', 'disputed'))::int as failed
    FROM app.calls
    WHERE COALESCE(started_at, ended_at) >= NOW() - ($1::int || ' days')::interval
    GROUP BY DATE(COALESCE(started_at, ended_at))
    ORDER BY date ASC
  `, [days]);

  return ok(rows);
}, { resource: "calls", action: "view" });
