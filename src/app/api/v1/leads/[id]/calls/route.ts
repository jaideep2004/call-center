import { apiHandler, ok, fail } from "@/server/api-utils";
import { query, queryOne } from "@/server/db";
import { leads } from "@/server/repositories";

export const GET = apiHandler(async (_req, { params, agencyId }) => {
  const { id } = await params;
  const lead = await leads.findById(id, agencyId ?? undefined).catch(() => null);
  if (!lead) return fail("Lead not found", 404);

  const rows = await query(
    `SELECT c.id, c.state, c.started_at, c.connected_at, c.ended_at, c.from_hash,
            EXTRACT(EPOCH FROM (c.ended_at - c.connected_at))::int as duration_seconds,
            d.outcome as disposition_outcome, d.annual_premium_cents, d.notes as disposition_notes
     FROM app.calls c
     LEFT JOIN app.dispositions d ON d.call_id = c.id
     WHERE c.agency_id = $1 AND c.from_hash = $2
     ORDER BY c.started_at DESC NULLS LAST`,
    [agencyId, lead.phone_hash],
  );

  return ok(rows);
}, { resource: "leads", action: "view" });
