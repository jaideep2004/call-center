import { apiHandler, ok, created, paginated } from "@/server/api-utils";
import { leads } from "@/server/repositories";
import { validate, createLeadSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "25");
  const sortBy = url.searchParams.get("sortBy") ?? "created_at";
  const order = (url.searchParams.get("order") ?? "desc") as "asc" | "desc";
  const search = url.searchParams.get("search") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const source = url.searchParams.get("source") ?? undefined;
  const assignedAgentId = url.searchParams.get("assignedAgentId") ?? undefined;
  const startDate = url.searchParams.get("startDate") ?? undefined;
  const endDate = url.searchParams.get("endDate") ?? undefined;

  const { rows, pagination } = await leads.findManyWithFilters({
    agencyId: context.agencyId!,
    page, limit, sortBy, order, search,
    status, source, assignedAgentId, startDate, endDate,
  });

  return paginated(rows, pagination);
}, { resource: "leads", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = validate(createLeadSchema, await req.json());
  const lead = await leads.create({ ...body, agency_id: context.agencyId ?? body.agency_id });
  return created(lead);
}, { resource: "leads", action: "create" });
