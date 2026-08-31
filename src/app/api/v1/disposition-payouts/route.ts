import { apiHandler, ok } from "@/server/api-utils";
import { dispositionPayouts } from "@/server/repositories";
import { validate, updateDispositionPayoutSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok([]);
  const rows = await dispositionPayouts.findByAgency(agencyId);
  return ok(rows);
}, { resource: "calls", action: "view" });

export const PUT = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok([]);
  const body = validate(updateDispositionPayoutSchema, await req.json());
  const row = await dispositionPayouts.upsert(agencyId, body.outcome, body.amount_cents);
  return ok(row, "Payout updated");
}, { resource: "calls", action: "manage" });
