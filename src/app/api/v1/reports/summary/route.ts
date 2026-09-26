import { apiHandler, okCached } from "@/server/api-utils";
import { queryOne, query } from "@/server/db";

interface Summary {
  total_calls: number;
  total_revenue_cents: number;
  active_campaigns: number;
  agents_online: number;
  total_leads: number;
}

export const GET = apiHandler(async (_req, context) => {
  // Platform admin sees platform totals; everyone else is scoped to their
  // own agency (agents must never see global revenue/counts).
  const agencyId = context.user?.role === "admin" ? null : (context.agencyId ?? null);
  if (!agencyId && context.user?.role !== "admin") {
    return okCached({ total_calls: 0, total_revenue_cents: 0, active_campaigns: 0, agents_online: 0, total_leads: 0 }, 15);
  }
  const params: unknown[] = [];
  // One $N placeholder per subquery (Postgres positions are query-global).
  const scoped = (alias: string): string => {
    if (!agencyId) return "";
    params.push(agencyId);
    return ` AND ${alias}.agency_id = $${params.length}`;
  };
  const callsClause = scoped("calls");
  const invClause = scoped("invoices");
  const campClause = scoped("campaigns");
  const agentClause = scoped("agents");
  const leadClause = scoped("leads");
  const summary = await queryOne<Summary>(
    `SELECT
      (SELECT COUNT(*) FROM app.calls WHERE true${callsClause})::int as total_calls,
      (SELECT COALESCE(SUM(total_cents), 0) FROM app.invoices WHERE status = 'paid'${invClause})::bigint as total_revenue_cents,
      (SELECT COUNT(*) FROM app.campaigns WHERE status = 'active'${campClause})::int as active_campaigns,
      (SELECT COUNT(*) FROM app.agents WHERE availability = 'available'${agentClause})::int as agents_online,
      (SELECT COUNT(*) FROM app.leads WHERE true${leadClause})::int as total_leads`,
    params,
  );
  return okCached(summary ?? { total_calls: 0, total_revenue_cents: 0, active_campaigns: 0, agents_online: 0, total_leads: 0 }, 15);
}, { resource: "reports", action: "view" });
