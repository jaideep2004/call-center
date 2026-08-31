import { apiHandler, ok } from "@/server/api-utils";
import { query } from "@/server/db";
import { z } from "zod";
import { validate } from "@/server/validate";

const conversionQuerySchema = z.object({ days: z.coerce.number().int().positive().default(30) });

interface ConversionRow {
  date: string;
  total: number;
  connected: number;
  conversion_rate: number;
}

export const GET = apiHandler(async (req) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { days } = validate(conversionQuerySchema, params);

  const rows = await query<ConversionRow>(`
    SELECT
      DATE(started_at) as date,
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE state = 'connected' OR state = 'ended')::int as connected,
      ROUND(
        COUNT(*) FILTER (WHERE state = 'connected' OR state = 'ended')::numeric
        / GREATEST(COUNT(*), 1) * 100, 1
      ) as conversion_rate
    FROM app.calls
    WHERE started_at >= NOW() - ($1::int || ' days')::interval
    GROUP BY DATE(started_at)
    ORDER BY date ASC
  `, [days]);

  return ok(rows);
}, { resource: "calls", action: "view" });
