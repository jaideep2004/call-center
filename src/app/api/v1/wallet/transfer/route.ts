import { apiHandler, ok, fail } from "@/server/api-utils";
import { walletTransfers } from "@/server/repositories";
import { validate, createWalletTransferSchema } from "@/server/validate";

export const POST = apiHandler(async (req, { membership, agencyId }) => {
  if (!membership) return fail("Membership required", 403);
  if (!agencyId) return fail("Agency required", 403);
  const body = validate(createWalletTransferSchema, await req.json());

  const transfer = await walletTransfers.transferToAgent({
    fromMembershipId: membership.id,
    fromAgencyId: agencyId,
    toAgentId: body.agent_id,
    amountCents: body.amount_cents,
    reason: body.reason,
  });

  return ok(transfer, "Transfer completed");
}, { resource: "wallet", action: "manage" });
