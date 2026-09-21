import { apiHandler, fail } from "@/server/api-utils";
import { query } from "@/server/db";
import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { toExcelBuffer } from "@/lib/excel";

export const runtime = "nodejs";

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const formatRaw = (url.searchParams.get("format") ?? "csv").toLowerCase();
  if (formatRaw !== "csv" && formatRaw !== "xlsx") {
    return fail(`Unsupported export format "${formatRaw}". Use format=csv or format=xlsx`, 400) as unknown as NextResponse;
  }
  const format = formatRaw as "csv" | "xlsx";

  const rows = await query<Record<string, unknown>>(`
    SELECT DATE(c.started_at) as date, COUNT(*)::int as calls,
           COALESCE(SUM(i.total_cents), 0)::bigint as revenue
    FROM app.calls c LEFT JOIN app.invoices i ON i.call_id = c.id
    WHERE c.agency_id = $1 AND c.started_at >= NOW() - interval '30 days'
    GROUP BY DATE(c.started_at) ORDER BY date ASC
  `, [context.agencyId]);

  const columns = [
    { key: "date", label: "Date" },
    { key: "calls", label: "Calls" },
    { key: "revenue", label: "Revenue (cents)" },
  ];

  // Phase 3 (point 7): the reports-page "Excel" link requested ?format=xlsx
  // on this CSV-only endpoint and silently downloaded a CSV. Honor it.
  if (format === "xlsx") {
    const buffer = await toExcelBuffer(rows, columns);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="report-export-${Date.now()}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const csv = toCsv(rows, columns);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report-export-${Date.now()}.csv"`,
    },
  });
}, { resource: "reports", action: "view" });
