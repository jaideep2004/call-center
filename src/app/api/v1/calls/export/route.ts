import { apiHandler, fail } from "@/server/api-utils";
import { query } from "@/server/db";
import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { toExcelBuffer } from "@/lib/excel";

export const runtime = "nodejs";

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const formatRaw = (url.searchParams.get("format") ?? "csv").toLowerCase();
  // Only csv and xlsx supported; reject json etc. that caused Site wasn’t available
  if (formatRaw !== "csv" && formatRaw !== "xlsx") {
    return fail(`Unsupported export format "${formatRaw}". Use format=csv or format=xlsx`, 400) as unknown as NextResponse;
  }
  const format = formatRaw as "csv" | "xlsx";
  const state = url.searchParams.get("state");
  const search = url.searchParams.get("search");
  // agency scoped - allow privileged admin/super_admin without agencyId to export across agencies
  const role = context.user?.role ?? "agent";
  const isPrivileged = role === "admin" || role === "super_admin";
  if (!context.agencyId && !isPrivileged) {
    return fail("Agency scope required", 403) as unknown as NextResponse;
  }
  const params: unknown[] = [];
  const clauses: string[] = [];
  if (context.agencyId) {
    params.push(context.agencyId);
    clauses.push(`c.agency_id = $${params.length}`);
  }
  if (state) {
    params.push(state);
    clauses.push(`c.state = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(c.id::text LIKE $${params.length} OR c.from_hash LIKE $${params.length})`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const rows = await query<Record<string, unknown>>(
    `
    SELECT c.id, c.state, c.provider, c.from_hash, c.started_at, c.connected_at, c.ended_at,
           a.id as agent_id,
           EXTRACT(EPOCH FROM (c.ended_at - c.connected_at))::int as duration_seconds,
           d.outcome as disposition_outcome, d.annual_premium_cents
    FROM app.calls c
    LEFT JOIN app.agents a ON a.id = c.agent_id
    LEFT JOIN app.dispositions d ON d.call_id = c.id
    ${where}
    ORDER BY c.created_at DESC
  `,
    params,
  );

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
        "Cache-Control": "no-store",
      },
    });
  }

  const csv = toCsv(rows, columns);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="calls-export-${Date.now()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}, { resource: "calls", action: "view" });
