import { apiHandler, ok, fail } from "@/server/api-utils";
import { validate, agencyAllocationSchema } from "@/server/validate";
import { agencyWallets, agents } from "@/server/repositories";
import { syncOfferWalletPauses } from "@/server/services/offer-wallet-sync";

export const runtime = "nodejs";

/**
 * PUT /api/v1/agency/wallet/allocations — head-only agent funding (P1.4).
 * Moves WITHIN the pool: sum(allocations) can never exceed the pool balance,
 * so allocations grant routing eligibility without minting money.
 */
export const PUT = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return fail("Agency required", 403);
  const body = validate(agencyAllocationSchema, await req.json());

  // Agency-scoped lookup: cross-agency agent ids 404 (no IDOR).
  const agent = await agents.findById(body.agent_id, agencyId).catch(() => null);
  if (!agent) return fail("Agent not found in your agency", 404);

  const [pool, allocations] = await Promise.all([
    agencyWallets.getPool(agencyId),
    agencyWallets.listAllocations(agencyId),
  ]);
  const othersTotal = allocations
    .filter((a) => a.agent_id !== body.agent_id)
    .reduce((sum, a) => sum + (a.allocated_cents ?? 0), 0);
  if (othersTotal + body.allocated_cents > pool.balance_cents) {
    return fail(
      `Allocations would exceed the pool balance (${othersTotal + body.allocated_cents} > ${pool.balance_cents})`,
      422,
    );
  }

  const row = await agencyWallets.setAllocation(agencyId, body.agent_id, body.allocated_cents);
  // Best-effort: re-evaluate Retreaver pauses now instead of waiting for the
  // 30s sweep. Never breaks the write path.
  void syncOfferWalletPauses(agencyId).catch((e) =>
    console.warn(`[allocations] post-write sync failed: ${String(e).slice(0, 160)}`),
  );
  return ok(row, "Allocation updated");
}, { resource: "agency", action: "manage" });
