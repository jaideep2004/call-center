import { apiHandler, ok, fail } from "@/server/api-utils";
import { walletTransfers } from "@/server/repositories";

export const GET = apiHandler(async (_req, { agencyId }) => {
  if (!agencyId) return fail("Agency required", 403);
  const transfers = await walletTransfers.findByAgency(agencyId);
  return ok(transfers);
}, { resource: "wallet", action: "view" });
