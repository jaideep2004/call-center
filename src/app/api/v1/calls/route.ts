import { apiHandler, ok, created, paginated, fail } from "@/server/api-utils";
import { calls } from "@/server/repositories";
import { validate, createCallSchema, paginationSchema, searchSchema, sortSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { page, limit } = validate(paginationSchema, params);
  const { search } = validate(searchSchema, params);
  const { sortBy, order } = validate(sortSchema, params);
  const stateParam = url.searchParams.get("state") ?? undefined;
  const state = stateParam ? (stateParam.includes(",") ? stateParam.split(",").map((s) => s.trim()).filter(Boolean) : stateParam) : undefined;
  const agentId = url.searchParams.get("agent_id") ?? undefined;
  const providerAgentCallId = url.searchParams.get("provider_agent_call_id") ?? undefined;

  // Platform admin sees every agency's calls; everyone else is confined to
  // their own agency (and fails closed without one).
  const isAdmin = context.user?.role === "admin";
  const scopeAgency = isAdmin ? undefined : (context.agencyId ?? undefined);
  if (!isAdmin && !scopeAgency) return fail("Agency scope required", 403);

  const { rows, pagination } = await calls.findMany({
    pagination: { page, limit },
    search,
    sortBy,
    order,
    agencyId: scopeAgency,
    state,
    filters: {
      ...(agentId ? { agent_id: agentId } : {}),
      ...(providerAgentCallId ? { provider_agent_call_id: providerAgentCallId } : {}),
    },
  });

  return paginated(rows, pagination);
}, { resource: "calls", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = validate(createCallSchema, await req.json());
  const call = await calls.create({ ...body, agency_id: context.agencyId ?? body.agency_id });
  return created(call);
}, { resource: "calls", action: "create" });
