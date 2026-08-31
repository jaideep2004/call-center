import { apiHandler, ok } from "@/server/api-utils";
import { deployCampaign } from "@/server/services/retreaver-campaigns";

export const POST = apiHandler(async (_req, { params }) => {
  const { id } = await params;
  const campaign = await deployCampaign(id);
  return ok(campaign, "Campaign deployed to Retreaver");
}, { resource: "settings", action: "update" });
