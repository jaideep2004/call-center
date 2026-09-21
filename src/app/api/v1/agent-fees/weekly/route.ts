import { apiHandler, ok } from "@/server/api-utils";
import { generateWeeklyInvoices } from "@/server/services/agent-fees";

export const POST = apiHandler(async () => {
  const { invoices, feesIncluded, emailsSent } = await generateWeeklyInvoices();
  return ok({ invoices, feesIncluded, emailsSent }, "Weekly invoices generated");
}, { resource: "wallet", action: "manage" });
