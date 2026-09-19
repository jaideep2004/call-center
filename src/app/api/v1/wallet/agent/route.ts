import { apiHandler, ok, fail } from "@/server/api-utils";
import { walletEntries, agents, agencyWallets } from "@/server/repositories";
import { validate, agentWalletTopUpSchema } from "@/server/validate";

export const GET = apiHandler(async (req, { membership }) => {
  if (!membership) return ok({ balance_cents: 0 });
  const agent = await agents.findByMembershipId(membership.id);
  if (!agent) return ok({ balance_cents: 0 });
  const [balance, allocated] = await Promise.all([
    walletEntries.sumByAgent(agent.id),
    agencyWallets.allocationForAgent(agent.id),
  ]);
  return ok({
    balance_cents: balance,
    agent_id: agent.id,
    // P1.4 dual-wallet split: personal ledger + agency-pool allocation.
    allocated_cents: allocated,
    effective_balance_cents: balance + allocated,
  });
}, { resource: "wallet", action: "view" });

export const POST = apiHandler(async (req, { membership, agencyId }) => {
  if (!membership) return fail("Agent membership required", 403);
  const body = validate(agentWalletTopUpSchema, await req.json());
  const agent = await agents.findByMembershipId(membership.id);
  if (!agent) return fail("Agent profile not found", 404);

  const entry = await walletEntries.create({
    agency_id: agencyId ?? "default",
    agent_id: agent.id,
    type: "top_up",
    amount_cents: body.amount_cents,
    // crypto.randomUUID() avoids the 1ms Date.now() collision risk on
    // double-click (two requests landing in the same millisecond would
    // otherwise race on the UNIQUE idempotency_key).
    idempotency_key: `agent_topup_${agent.id}_${crypto.randomUUID()}`,
  });
  return ok(entry, "Wallet topped up");
}, { resource: "wallet", action: "manage" });
