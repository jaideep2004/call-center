import { apiHandler, ok } from "@/server/api-utils";
import { syncRetreaverCampaigns } from "@/server/services/retreaver-campaigns";

export const POST = apiHandler(async (_req, context) => {
  const result = await syncRetreaverCampaigns({ agencyId: context.agencyId ?? null });
  return ok(result, "Retreaver campaigns synced");
}, { resource: "publishers", action: "manage" });
