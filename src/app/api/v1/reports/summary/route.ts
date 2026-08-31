import { apiHandler, okCached } from "@/server/api-utils";
import { queryOne, query } from "@/server/db";

interface Summary {
  total_calls: number;
  total_revenue_cents: number;
  active_campaigns: number;
  agents_online: number;
  total_leads: number;
}

export const GET = apiHandler(async () => {
  const summary = await queryOne<Summary>(`
    SELECT
      (SELECT COUNT(*) FROM app.calls)::int as total_calls,
      (SELECT COALESCE(SUM(total_cents), 0) FROM app.invoices WHERE status = 'paid')::bigint as total_revenue_cents,
      (SELECT COUNT(*) FROM app.campaigns WHERE status = 'active')::int as active_campaigns,
      (SELECT COUNT(*) FROM app.agents WHERE availability = 'available')::int as agents_online,
      (SELECT COUNT(*) FROM app.leads)::int as total_leads
  `);
  return okCached(summary ?? { total_calls: 0, total_revenue_cents: 0, active_campaigns: 0, agents_online: 0, total_leads: 0 }, 15);
}, { resource: "reports", action: "view" });
