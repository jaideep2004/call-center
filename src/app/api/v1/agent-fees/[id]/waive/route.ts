import { apiHandler, ok, fail } from "@/server/api-utils";
import { agentFees } from "@/server/repositories";

export const POST = apiHandler(async (req, { params, agencyId, user }) => {
  const { id } = await params;
  const scope = agencyId ?? undefined;
  if (!scope && !["super_admin", "admin"].includes(user?.role ?? "")) return fail("Agency scope required", 403);
  const fee = scope ? await agentFees.findByIdForAgency(id, scope) : null;
  if (!fee) return fail("Fee not found", 404);
  const row = await agentFees.setStatus(id, "waived");
  if (!row) return fail("Fee is not pending", 409);
  return ok(row, "Fee waived");
}, { resource: "wallet", action: "manage" });
