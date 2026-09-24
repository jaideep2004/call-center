import { apiHandler, ok, created, paginated, fail } from "@/server/api-utils";
import { calls, agents } from "@/server/repositories";
import { validate, createCallSchema, paginationSchema, searchSchema, sortSchema } from "@/server/validate";

export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { page, limit } = validate(paginationSchema, params);
  const { search } = validate(searchSchema, params);
  const { sortBy, order } = validate(sortSchema, params);
  const stateParam = url.searchParams.get("state") ?? undefined;
  const state = stateParam ? (stateParam.includes(",") ? stateParam.split(",").map((s) => s.trim()).filter(Boolean) : stateParam) : undefined;
  const providerAgentCallId = url.searchParams.get("provider_agent_call_id") ?? undefined;

  // Platform admin sees every agency's calls; heads see their agency;
  // plain agents see ONLY their own calls (agent_id is forced, never
  // trusted from the query string — otherwise agents could list teammates'
  // calls by omitting it). Everyone else fails closed without an agency.
  const isAdmin = context.user?.role === "admin";
  const scopeAgency = isAdmin ? undefined : (context.agencyId ?? undefined);
  if (!isAdmin && !scopeAgency) return fail("Agency scope required", 403);

  let agentId = url.searchParams.get("agent_id") ?? undefined;
  if (!isAdmin && !context.isHead) {
    const me = context.membership ? await agents.findByMembershipId(context.membership.id).catch(() => null) : null;
    if (!me) return fail("Agent profile not found", 403);
    agentId = me.id;
  }

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
