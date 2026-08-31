import { apiHandler, ok } from "@/server/api-utils";
import { invoices } from "@/server/repositories";

export const GET = apiHandler(async (req, { params, agencyId }) => {
  const { id } = await params;
  const invoice = await invoices.findById(id, agencyId ?? undefined);
  return ok(invoice);
}, { resource: "calls", action: "view" });

export const PATCH = apiHandler(async (req, { params, agencyId }) => {
  const { id } = await params;
  const invoice = await invoices.update(id, { status: "sent" }, agencyId ?? undefined);
  return ok(invoice, "Invoice marked sent");
}, { resource: "wallet", action: "manage" });
