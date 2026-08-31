import { apiHandler, ok, fail } from "@/server/api-utils";
import { query } from "@/server/db";
import { agents, walletEntries } from "@/server/repositories";

export const GET = apiHandler(async (_req, { agencyId }) => {
  if (!agencyId) return fail("Agency required", 403);

  const rows = await agents.findMany({ agencyId });
  const stats = await query<{ agent_id: string; call_count: string; connected_seconds: string }>(
    `SELECT agent_id,
            COUNT(*)::text as call_count,
            COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - connected_at)) * 1000)::text, '0') as connected_seconds
     FROM app.calls
     WHERE agency_id = $1 AND agent_id IS NOT NULL AND state = 'ended'
     GROUP BY agent_id`,
    [agencyId],
  );
  const statsByAgent = new Map(stats.map((s) => [s.agent_id, s]));

  const performance = await Promise.all(
    rows.rows.map(async (a) => {
      const s = statsByAgent.get(a.id);
      return {
        id: a.id,
        name: a.user_name ?? a.id.slice(0, 8),
        email: a.user_email ?? null,
        availability: a.availability,
        approval_status: a.approval_status,
        balance_cents: await walletEntries.sumByAgent(a.id),
        call_count: parseInt(s?.call_count ?? "0", 10),
        connected_seconds_ms: parseInt(s?.connected_seconds ?? "0", 10),
      };
    }),
  );

  return ok(performance);
}, { resource: "wallet", action: "view" });
