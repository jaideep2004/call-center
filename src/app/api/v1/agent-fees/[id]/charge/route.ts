import { apiHandler, ok, fail } from "@/server/api-utils";
import { agentFees } from "@/server/repositories";
import { queryOne } from "@/server/db";

export const POST = apiHandler(async (req, { params, agencyId, user }) => {
  const { id } = await params;
  const scope = agencyId ?? undefined;
  if (!scope && !["super_admin", "admin"].includes(user?.role ?? "")) return fail("Agency scope required", 403);

  const fee = scope
    ? await agentFees.findByIdForAgency(id, scope)
    : await queryOne<{ id: string }>("SELECT id FROM app.agent_fees WHERE id = $1", [id]);
  if (!fee) return fail("Fee not found", 404);

  const row = await agentFees.setStatus(id, "charged");
  if (!row) return fail("Fee is not pending", 409);

  if (row.invoice_id) {
    await queryOne(
      "UPDATE app.invoices SET status = 'paid' WHERE id = $1",
      [row.invoice_id],
    );
  }
  return ok(row, "Fee marked charged");
}, { resource: "wallet", action: "manage" });
