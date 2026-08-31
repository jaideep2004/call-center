import { apiHandler, ok } from "@/server/api-utils";
import { generateWeeklyInvoices } from "@/server/services/agent-fees";

export const POST = apiHandler(async () => {
  const { invoices, feesIncluded } = await generateWeeklyInvoices();
  return ok({ invoices, feesIncluded }, "Weekly invoices generated");
}, { resource: "wallet", action: "manage" });
