import { apiHandler, ok, paginated, requireHeadOr } from "@/server/api-utils";
import { memberships } from "@/server/repositories";

export const GET = apiHandler(async (req, context) => {
  requireHeadOr(context, "users", "view");
  // Platform admin sees every membership; heads see their own agency.
  const filters = context.user?.role === "admin" ? {} : context.agencyId ? { agency_id: context.agencyId } : {};
  const { rows, pagination } = await memberships.findMany({
    pagination: { page: 1, limit: 100 },
    filters,
  });
  return paginated(rows, pagination);
}, { resource: "users", action: "view", allowHead: true });
