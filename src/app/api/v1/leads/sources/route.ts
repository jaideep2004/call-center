import { apiHandler, ok } from "@/server/api-utils";
import { leads } from "@/server/repositories";

export const GET = apiHandler(async (req, context) => {
  const sources = await leads.getDistinctSources(context.agencyId!);
  return ok(sources);
}, { resource: "leads", action: "view" });
