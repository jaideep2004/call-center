import { apiHandler, ok } from "@/server/api-utils";
import { query } from "@/server/db";
import { z } from "zod";
import { validate } from "@/server/validate";

const callsVolumeQuerySchema = z.object({ days: z.coerce.number().int().positive().default(30) });

export const GET = apiHandler(async (req) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { days } = validate(callsVolumeQuerySchema, params);

  const rows = await query<{ date: string; count: number }>(`
    SELECT DATE(started_at) as date, COUNT(*)::int as count
    FROM app.calls
    WHERE started_at >= NOW() - ($1::int || ' days')::interval
    GROUP BY DATE(started_at)
    ORDER BY date ASC
  `, [days]);

  return ok(rows);
}, { resource: "calls", action: "view" });
