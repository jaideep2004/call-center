import { apiHandler, ok } from "@/server/api-utils";
import { affiliates } from "@/server/repositories";

export const GET = apiHandler(async (req, { params }) => {
  const { id } = await params;
  const affiliate = await affiliates.findByAgentId(id);
  return ok(affiliate);
}, { resource: "affiliate", action: "view" });
