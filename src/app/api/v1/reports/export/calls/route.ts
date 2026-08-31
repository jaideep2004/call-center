import { apiHandler } from "@/server/api-utils";
import { query } from "@/server/db";
import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";

export const GET = apiHandler(async (req, context) => {
  const rows = await query<Record<string, unknown>>(`
    SELECT DATE(c.started_at) as date, COUNT(*)::int as calls,
           COALESCE(SUM(i.total_cents), 0)::bigint as revenue
    FROM app.calls c LEFT JOIN app.invoices i ON i.call_id = c.id
    WHERE c.agency_id = $1 AND c.started_at >= NOW() - interval '30 days'
    GROUP BY DATE(c.started_at) ORDER BY date ASC
  `, [context.agencyId]);

  const csv = toCsv(rows, [
    { key: "date", label: "Date" },
    { key: "calls", label: "Calls" },
    { key: "revenue", label: "Revenue (cents)" },
  ]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report-export-${Date.now()}.csv"`,
    },
  });
}, { resource: "reports", action: "view" });
