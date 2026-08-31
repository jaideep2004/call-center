import { apiHandler, ok, paginated } from "@/server/api-utils";
import { memberships } from "@/server/repositories";

export const GET = apiHandler(async (req, context) => {
  const { rows, pagination } = await memberships.findMany({
    pagination: { page: 1, limit: 100 },
    filters: context.agencyId ? { agency_id: context.agencyId } : {},
  });
  return paginated(rows, pagination);
}, { resource: "users", action: "view" });
