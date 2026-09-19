import { query, queryOne } from "@/server/db";
import { ok } from "@/server/api-utils";
import { publicApiHandler } from "@/server/api-utils";

export const runtime = "nodejs";

interface PlanRow {
  id: string;
  name: string;
  price_cents: number;
  call_allowance: number;
  billing_type: string;
  features: Record<string, unknown> | null;
}

function featureList(features: PlanRow["features"]): string[] {
  if (!features || typeof features !== "object") return [];
  const list = (features as { list?: unknown }).list;
  if (!Array.isArray(list)) return [];
  return list.map((x) => String(x ?? "").trim()).filter(Boolean);
}

/**
 * GET /api/v1/public/plans — homepage pricing cards (no auth).
 * Active plans of the earliest agency, cheapest first. Public-safe fields
 * only (no margins, no internals). Empty array = homepage keeps its
 * built-in cards, so the page never renders blank.
 */
export const GET = publicApiHandler(async () => {
  const agency = await queryOne<{ id: string }>(
    `SELECT id FROM app.agencies ORDER BY created_at ASC LIMIT 1`,
  );
  if (!agency) return ok([]);
  const rows = await query<PlanRow>(
    `SELECT id, name, price_cents, call_allowance, billing_type, features
       FROM app.agent_plans
      WHERE agency_id = $1 AND active = true
      ORDER BY price_cents ASC`,
    [agency.id],
  );
  return ok(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      price_cents: r.price_cents,
      call_allowance: r.call_allowance,
      billing_type: r.billing_type,
      features: featureList(r.features),
    })),
  );
});
