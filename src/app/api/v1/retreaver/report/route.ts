import { apiHandler, ok } from "@/server/api-utils";
import { retreaverCalls } from "@/server/repositories";

export const GET = apiHandler(async (_req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok({ rows: [], totals: { calls: 0, connected_calls: 0, payout_cents: 0, campaign_revenue_cents: 0 } });
  const rows = await retreaverCalls.reportByPublisher(agencyId);
  const totals = rows.reduce(
    (acc, r) => {
      acc.calls += parseInt(r.calls ?? "0", 10);
      acc.connected_calls += parseInt(r.connected_calls ?? "0", 10);
      acc.payout_cents += parseInt(r.payout_cents ?? "0", 10);
      acc.campaign_revenue_cents += parseInt(r.campaign_revenue_cents ?? "0", 10);
      return acc;
    },
    { calls: 0, connected_calls: 0, payout_cents: 0, campaign_revenue_cents: 0 },
  );
  return ok({ rows, totals });
}, { resource: "publishers", action: "view" });
