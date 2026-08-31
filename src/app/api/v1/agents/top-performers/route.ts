import { apiHandler, ok } from "@/server/api-utils";
import { query } from "@/server/db";
import { z } from "zod";
import { validate } from "@/server/validate";

const topPerformersSchema = z.object({
  days: z.coerce.number().int().positive().default(30),
  limit: z.coerce.number().int().positive().default(10),
});

interface TopPerformerRow {
  agent_id: string;
  call_count: number;
  total_seconds: number;
  total_cents: number;
  conversion_count: number;
  conversion_rate: number;
}

export const GET = apiHandler(async (req) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { days, limit } = validate(topPerformersSchema, params);

  const rows = await query<TopPerformerRow>(`
    SELECT
      c.agent_id,
      COUNT(*)::int as call_count,
      COALESCE(SUM(EXTRACT(EPOCH FROM (c.ended_at - c.connected_at)))::int, 0) as total_seconds,
      COALESCE(SUM(i.total_cents), 0)::bigint as total_cents,
      COUNT(*) FILTER (WHERE c.state = 'ended')::int as conversion_count,
      ROUND(
        COUNT(*) FILTER (WHERE c.state = 'ended')::numeric
        / GREATEST(COUNT(*), 1) * 100, 1
      ) as conversion_rate
    FROM app.calls c
    LEFT JOIN app.invoices i ON i.call_id = c.id
    WHERE c.started_at >= NOW() - ($1::int || ' days')::interval
      AND c.agent_id IS NOT NULL
    GROUP BY c.agent_id
    ORDER BY total_cents DESC
    LIMIT $2
  `, [days, limit]);

  return ok(rows);
}, { resource: "reports", action: "view" });
