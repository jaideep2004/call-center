import { apiHandler } from "@/server/api-utils";
import { query } from "@/server/db";
import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { toExcelBuffer } from "@/lib/excel";

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "csv";
  const state = url.searchParams.get("state");
  const search = url.searchParams.get("search");
  const params: unknown[] = [context.agencyId];
  const clauses: string[] = ["c.agency_id = $1"];
  if (state) { params.push(state); clauses.push(`c.state = $${params.length}`); }
  if (search) { params.push(`%${search}%`); clauses.push(`(c.id::text LIKE $${params.length} OR c.from_hash LIKE $${params.length})`); }

  const rows = await query<Record<string, unknown>>(`
    SELECT c.id, c.state, c.provider, c.from_hash, c.started_at, c.connected_at, c.ended_at,
           a.id as agent_id,
           EXTRACT(EPOCH FROM (c.ended_at - c.connected_at))::int as duration_seconds,
           d.outcome as disposition_outcome, d.annual_premium_cents
    FROM app.calls c
    LEFT JOIN app.agents a ON a.id = c.agent_id
    LEFT JOIN app.dispositions d ON d.call_id = c.id
    WHERE ${clauses.join(" AND ")}
    ORDER BY c.created_at DESC
  `, params);

  const columns = [
    { key: "id", label: "Call ID" },
    { key: "state", label: "State" },
    { key: "provider", label: "Provider" },
    { key: "from_hash", label: "From" },
    { key: "agent_id", label: "Agent ID" },
    { key: "started_at", label: "Started" },
    { key: "connected_at", label: "Connected" },
    { key: "ended_at", label: "Ended" },
    { key: "duration_seconds", label: "Duration (s)" },
    { key: "disposition_outcome", label: "Disposition" },
    { key: "annual_premium_cents", label: "Annual Premium (cents)" },
  ];

  if (format === "xlsx") {
    const buffer = await toExcelBuffer(rows, columns);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="calls-export-${Date.now()}.xlsx"`,
      },
    });
  }

  const csv = toCsv(rows, columns);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="calls-export-${Date.now()}.csv"`,
    },
  });
}, { resource: "calls", action: "view" });
