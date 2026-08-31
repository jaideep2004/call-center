import { apiHandler, ok } from "@/server/api-utils";
import { query } from "@/server/db";
import { z } from "zod";
import { validate } from "@/server/validate";

const durationQuerySchema = z.object({ days: z.coerce.number().int().positive().default(30) });

interface DurationRow {
  date: string;
  avg_seconds: number;
  total_calls: number;
}

export const GET = apiHandler(async (req) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { days } = validate(durationQuerySchema, params);

  const rows = await query<DurationRow>(`
    SELECT
      DATE(started_at) as date,
      COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (ended_at - connected_at)))), 0)::int as avg_seconds,
      COUNT(*) FILTER (WHERE ended_at IS NOT NULL AND connected_at IS NOT NULL)::int as total_calls
    FROM app.calls
    WHERE started_at >= NOW() - ($1::int || ' days')::interval
      AND connected_at IS NOT NULL
      AND ended_at IS NOT NULL
    GROUP BY DATE(started_at)
    ORDER BY date ASC
  `, [days]);

  return ok(rows);
}, { resource: "calls", action: "view" });
