import { apiHandler, ok, created, paginated, fail } from "@/server/api-utils";
import { calls, agents, campaigns } from "@/server/repositories";
import { validate, createCallSchema, paginationSchema, searchSchema, sortSchema } from "@/server/validate";
import { callerRevealFor } from "@/server/services/caller-reveal";

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

  // Plain agents see ONLY their own calls (agent_id forced above) — and must
  // NOT also be agency-filtered: platform-agency (00000000) calls belong to
  // no member agency, so the extra filter hid every assigned call from the
  // agent dashboard ("0 total calls", empty lists). Ownership is the scope.
  const ownOnly = !isAdmin && !context.isHead;
  const { rows, pagination } = await calls.findMany({
    pagination: { page, limit },
    search,
    sortBy,
    order,
    agencyId: ownOnly ? undefined : scopeAgency,
    state,
    filters: {
      ...(agentId ? { agent_id: agentId } : {}),
      ...(providerAgentCallId ? { provider_agent_call_id: providerAgentCallId } : {}),
    },
  });

  // Post-buffer caller reveal (Option A escrow), batched per campaign.
  // Rows are already visibility-scoped above (own/agency/all).
  const campaignIds = [...new Set(rows.map((r) => r.campaign_id).filter(Boolean))];
  const buffers = new Map<string, number>();
  await Promise.all(
    campaignIds.map(async (cid) => {
      const c = await campaigns.findById(cid, ownOnly ? undefined : scopeAgency).catch(() => null);
      buffers.set(cid, c?.buffer_seconds ?? 30);
    }),
  );
  const visible = rows.map((r) => {
    const { caller_number_encrypted: _escrow, ...rest } = r as typeof r & { caller_number_encrypted?: string | null };
    void _escrow;
    const reveal = callerRevealFor(r, buffers.get(r.campaign_id) ?? 30);
    return { ...rest, caller_revealed: reveal.revealed, caller_number: reveal.caller_number };
  });

  return paginated(visible, pagination);
}, { resource: "calls", action: "view" });

export const POST = apiHandler(async (req, context) => {
  const body = validate(createCallSchema, await req.json());
  const call = await calls.create({ ...body, agency_id: context.agencyId ?? body.agency_id });
  return created(call);
}, { resource: "calls", action: "create" });
