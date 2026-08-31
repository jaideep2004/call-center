import { apiHandler, ok } from "@/server/api-utils";
import { affiliates } from "@/server/repositories";

export const GET = apiHandler(async (req, { params }) => {
  const { id } = await params;
  const earnings = await affiliates.findByAgentId(id);
  return ok(earnings);
}, { resource: "affiliate", action: "view" });
