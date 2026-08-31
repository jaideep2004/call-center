import { apiHandler, ok } from "@/server/api-utils";
import { query } from "@/server/db";

export interface AgentEarningsRow {
  agent_id: string;
  call_count: number;
  total_seconds: number;
  total_cents: number;
  avg_cents: number;
}

export const GET = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok([]);

  const url = new URL(req.url);
  const agentId = url.searchParams.get("agent_id");
  const startDate = url.searchParams.get("start_date");
  const endDate = url.searchParams.get("end_date");

  const params: unknown[] = [agencyId];
  const clauses: string[] = [];

  if (agentId) { params.push(agentId); clauses.push(`AND c.agent_id = $${params.length}`); }
  if (startDate) { params.push(startDate); clauses.push(`AND i.created_at >= $${params.length}`); }
  if (endDate) { params.push(endDate); clauses.push(`AND i.created_at <= $${params.length}`); }

  const sql = `
    SELECT
      c.agent_id,
      COUNT(*)::int AS call_count,
      COALESCE(SUM(EXTRACT(EPOCH FROM (c.ended_at - c.connected_at)))::int, 0) AS total_seconds,
      COALESCE(SUM(i.total_cents), 0) AS total_cents,
      COALESCE(ROUND(AVG(i.total_cents)), 0) AS avg_cents
    FROM app.invoices i
    JOIN app.calls c ON c.id = i.call_id
    WHERE i.agency_id = $1
      AND i.status = 'pending'
      ${clauses.join(" ")}
    GROUP BY c.agent_id
    ORDER BY total_cents DESC
  `;

  const rows = await query<AgentEarningsRow>(sql, params);
  return ok(rows);
}, { resource: "reports", action: "view" });
