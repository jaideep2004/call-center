import { apiHandler, ok, fail } from "@/server/api-utils";
import { walletEntries } from "@/server/repositories";

export const GET = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok({ balance_cents: 0, currency: "USD" });
  // Agency sum is head/admin-only (plain agents use /wallet/agent).
  if (context.user?.role !== "admin" && !context.isHead) {
    return fail("Heads only", 403);
  }
  const balance_cents = await walletEntries.sumByAgency(agencyId);
  return ok({ balance_cents, currency: "USD" });
}, { resource: "wallet", action: "view" });
