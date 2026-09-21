import { apiHandler, paginated, fail } from "@/server/api-utils";
import { campaigns, agents } from "@/server/repositories";
import { query } from "@/server/db";
import { validate, paginationSchema, searchSchema, sortSchema } from "@/server/validate";

export const runtime = "nodejs";

/**
 * GET /api/v1/agent/campaigns
 * Agent-browseable list of campaigns. For MVP we expose all active campaigns (or filtered status)
 * with enriched assignment metadata so the UI can show "Assigned" vs "Open" vs "Not assigned".
 * Uses `calls:view` so agent role can access (mirrors calls export permission).
 */
export const GET = apiHandler(async (req, context) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const { page, limit } = validate(paginationSchema, params);
  const { search } = validate(searchSchema, params);
  const { sortBy, order } = validate(sortSchema, params);
  // status filter: default active for browse, but allow any if provided
  const status = url.searchParams.get("status") ?? "active";
  // optional endpoint filter forwarded for UI but not enforced at DB — we filter post-query for MVP
  const endpoint = url.searchParams.get("endpoint");
  const stateFilter = url.searchParams.get("state");

  // Resolve current agent context
  let agentId: string | null = null;
  let agencyId: string | null = context.agencyId ?? null;
  if (context.membership?.id) {
    try {
      const ag = await agents.findByMembershipId(context.membership.id);
      agentId = ag?.id ?? null;
      // trust membership agency_id if not already resolved
      if (!agencyId && ag?.agency_id) agencyId = ag.agency_id;
    } catch {}
  }

  // Fetch campaigns via findManyWithBid without agency filter so agent sees all.
  // We bypass agency scoping for browse; direct query with status/search.
  const { rows, total } = await campaigns.findManyWithBid({
    // do not pass agencyId so we list across agencies for browse
    status: status || undefined,
    search,
    sortBy,
    order,
    limit,
    offset: (page - 1) * limit,
  });

  // Batch fetch assignment counts for these campaign ids
  const ids = rows.map((r) => r.id);
  let assignmentMap = new Map<string, { agencyCount: number; agentCount: number; agencyIds: string[]; agentIds: string[] }>();
  let assignedToMeSet = new Set<string>();
  let anyAssignedSet = new Set<string>();
  if (ids.length > 0) {
    const assignRows = await query<{ campaign_id: string; agency_id: string | null; agent_id: string | null }>(
      `SELECT campaign_id, agency_id, agent_id FROM app.campaign_assignments WHERE campaign_id = ANY($1::uuid[])`,
      [ids],
    );
    for (const r of assignRows) {
      let entry = assignmentMap.get(r.campaign_id);
      if (!entry) {
        entry = { agencyCount: 0, agentCount: 0, agencyIds: [], agentIds: [] };
        assignmentMap.set(r.campaign_id, entry);
      }
      if (r.agency_id) {
        entry.agencyCount += 1;
        entry.agencyIds.push(r.agency_id);
      }
      if (r.agent_id) {
        entry.agentCount += 1;
        entry.agentIds.push(r.agent_id);
      }
    }
    // Determine per-campaign assignment status for this viewer
    for (const c of rows) {
      const entry = assignmentMap.get(c.id);
      const hasAny = !!entry && (entry.agencyCount > 0 || entry.agentCount > 0);
      if (hasAny) anyAssignedSet.add(c.id);
      const isAssignedToMe =
        (!!agencyId && !!entry?.agencyIds.includes(agencyId)) ||
        (!!agentId && !!entry?.agentIds.includes(agentId));
      if (isAssignedToMe) assignedToMeSet.add(c.id);
    }
  }

  // Optionally filter by endpoint/state in-memory for MVP (since campaigns table doesn't have dedicated index for this)
  let filtered = rows as Array<(typeof rows)[number] & { _assignment?: unknown }>;
  // Keep original pagination total? If we filter in memory we would distort total. So only filter if endpoint/state provided and we can adjust.
  // For now, if endpoint filter present, filter rows and adjust total roughly (approximation).
  if (endpoint) {
    filtered = filtered.filter((c) => (c.allowed_endpoints ?? []).includes(endpoint));
  }
  if (stateFilter) {
    // target_states filter – campaign.target_states includes state
    // need to fetch target_states if not in row; ensure row has it – fallback to query if missing
    filtered = filtered.filter((c) => {
      const states = (c as unknown as { target_states?: string[] }).target_states ?? [];
      // if campaign has no target_states (empty = all states) treat as match
      if (!states || states.length === 0) return true;
      return states.includes(stateFilter);
    });
  }

  // Live-for-campaign flags for this viewer (P1.2: agent selects campaign in Take Calls)
  let liveSet = new Set<string>();
  if (agentId) {
    try {
      const liveRows = await query<{ campaign_id: string }>(
        `SELECT campaign_id FROM app.agent_campaign_selections WHERE agent_id = $1 AND is_live = true`,
        [agentId],
      );
      liveSet = new Set(liveRows.map((r) => r.campaign_id));
    } catch {}
  }

  // Enrich rows with assignment metadata.
  // Phase 4 (point 2): agents must never see publisher payouts — strip every
  // payout field the query returns (effective + min/max). The Browse UI only
  // renders the buyer price; this closes the API leak.
  const enriched = filtered.map((c) => {
    const {
      effective_payout_cents: _stripped1,
      effective_max_payout_cents: _stripped2,
      max_publisher_payout_cents: _stripped3,
      min_publisher_payout_cents: _stripped4,
      ...payoutFree
    } = c as unknown as Record<string, unknown>;
    void _stripped1; void _stripped2; void _stripped3; void _stripped4;
    const entry = assignmentMap.get((c as { id: string }).id);
    const hasAny = !!entry && (entry.agencyCount > 0 || entry.agentCount > 0);
    const isAssigned = assignedToMeSet.has(c.id);
    let assignment_status: "Assigned" | "Open" | "Not assigned";
    if (isAssigned) assignment_status = "Assigned";
    else if (!hasAny) assignment_status = "Open";
    else assignment_status = "Not assigned";
    return {
      ...payoutFree,
      assigned_agency_count: entry?.agencyCount ?? 0,
      assigned_agent_count: entry?.agentCount ?? 0,
      assignment_status,
      is_assigned_to_me: isAssigned,
      has_assignments: hasAny,
      is_live_for_me: liveSet.has(c.id),
    };
  });

  // If we filtered in-memory, adjust total accordingly (best-effort)
  let finalTotal = total;
  let finalTotalPages = Math.ceil(total / limit);
  if (endpoint || stateFilter) {
    // re-estimate total based on filtered ratio – for true accuracy we'd need COUNT(*) with same filter, but MVP approx is ok.
    // Instead fetch more accurate: if filtered length differs from rows length on first page, we just keep total as enriched length for filtered view when limit=100 case.
    // Keep simple: if filtering, set total based on filtered set extrapolation only when limit is large.
    // To avoid confusing pagination, we return filtered length as total when filter active and page=1 and limit >= total.
    // For production-grade we would need DB-level endpoint/state filter; for MVP we return filtered array and keep original pagination.
    // Override total to filtered count if filtered less than limit (indicates filter reduced result set visibility)
    if (filtered.length < rows.length || enriched.length !== rows.length) {
      // If client requested limit=100 style browse, returning exact filtered count makes UI pagination correct for browse
      // For paginated case, we keep original total but enriched pagination will still reflect correct page counts for unfiltered.
      // To be safe, when filtering, compute total as total - (rows.length - filtered.length) as estimate
      finalTotal = Math.max(0, total - (rows.length - filtered.length));
      finalTotalPages = Math.ceil(finalTotal / limit);
    }
  }

  const pagination = { page, limit, total: finalTotal, totalPages: finalTotalPages };
  return paginated(enriched, pagination);
}, { resource: "calls", action: "view" });
