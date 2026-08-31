import { apiHandler, ok } from "@/server/api-utils";
import { query } from "@/server/db";
import { z } from "zod";
import { validate } from "@/server/validate";

const revenueQuerySchema = z.object({ days: z.coerce.number().int().positive().default(30) });

export const GET = apiHandler(async (req) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { days } = validate(revenueQuerySchema, params);

  const rows = await query<{ date: string; revenue_cents: number; count: number }>(`
    SELECT DATE(created_at) as date, SUM(total_cents)::bigint as revenue_cents, COUNT(*)::int as count
    FROM app.invoices
    WHERE created_at >= NOW() - ($1::int || ' days')::interval
      AND status = 'paid'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `, [days]);

  return ok(rows);
}, { resource: "revenue", action: "view" });
