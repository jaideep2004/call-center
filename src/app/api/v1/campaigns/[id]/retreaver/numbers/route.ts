import { apiHandler, ok } from "@/server/api-utils";
import { getCampaignRetreaverNumbers } from "@/server/services/retreaver-campaigns";

export const GET = apiHandler(async (_req, { params }) => {
  const { id } = await params;
  const numbers = await getCampaignRetreaverNumbers(id);
  return ok(numbers);
}, { resource: "settings", action: "view" });
