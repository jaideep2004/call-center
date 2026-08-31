import { apiHandler, ok, fail } from "@/server/api-utils";
import { agentFees } from "@/server/repositories";
import { generateMonthlyFees, generateWeeklyInvoices } from "@/server/services/agent-fees";

export const GET = apiHandler(async (req, context) => {
  const agencyId = context.agencyId;
  if (!agencyId) return ok([]);
  const rows = await agentFees.findPendingByAgency(agencyId);
  return ok(rows);
}, { resource: "wallet", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const { generated, skipped } = await generateMonthlyFees();
  return ok({ generated, skipped }, "Monthly fees generated");
}, { resource: "wallet", action: "manage" });
