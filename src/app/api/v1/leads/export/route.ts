import { apiHandler } from "@/server/api-utils";
import { query } from "@/server/db";
import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { toExcelBuffer } from "@/lib/excel";

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "csv";
  const search = url.searchParams.get("search");
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");
  const assignedAgentId = url.searchParams.get("assignedAgentId");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const params: unknown[] = [context.agencyId];
  const clauses: string[] = ["l.agency_id = $1"];
  if (search) { params.push(`%${search}%`); clauses.push(`(l.email_hash LIKE $${params.length} OR l.phone_hash LIKE $${params.length})`); }
  if (status) { params.push(status); clauses.push(`l.status = $${params.length}`); }
  if (source) { params.push(source); clauses.push(`l.source = $${params.length}`); }
  if (assignedAgentId) { params.push(assignedAgentId); clauses.push(`l.assigned_agent_id = $${params.length}`); }
  if (startDate) { params.push(startDate); clauses.push(`l.created_at >= $${params.length}`); }
  if (endDate) { params.push(endDate); clauses.push(`l.created_at <= $${params.length}`); }

  const rows = await query<Record<string, unknown>>(`
    SELECT l.id, l.email_hash, l.phone_hash, l.source, l.status, l.assigned_agent_id, l.created_at,
           lc.started_at as last_call_started_at,
           EXTRACT(EPOCH FROM (lc.ended_at - lc.connected_at))::int as duration_seconds,
           ld.outcome as disposition_outcome, ld.annual_premium_cents
    FROM app.leads l
    LEFT JOIN app.calls lc ON lc.id = l.call_id
    LEFT JOIN app.dispositions ld ON ld.call_id = lc.id
    WHERE ${clauses.join(" AND ")}
    ORDER BY l.created_at DESC
  `, params);

  const columns = [
    { key: "id", label: "Lead ID" },
    { key: "email_hash", label: "Email" },
    { key: "phone_hash", label: "Phone" },
    { key: "source", label: "Source" },
    { key: "status", label: "Status" },
    { key: "assigned_agent_id", label: "Assigned Agent" },
    { key: "created_at", label: "Created" },
    { key: "last_call_started_at", label: "Last Call" },
    { key: "duration_seconds", label: "Duration (s)" },
    { key: "disposition_outcome", label: "Disposition" },
    { key: "annual_premium_cents", label: "Annual Premium (cents)" },
  ];

  if (format === "xlsx") {
    const buffer = await toExcelBuffer(rows, columns);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="leads-export-${Date.now()}.xlsx"`,
      },
    });
  }

  const csv = toCsv(rows, columns);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-export-${Date.now()}.csv"`,
    },
  });
}, { resource: "leads", action: "view" });
