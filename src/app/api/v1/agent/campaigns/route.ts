import { apiHandler, paginated, fail } from "@/server/api-utils";
import { campaigns, agents } from "@/server/repositories";
import { query } from "@/server/db";
import { validate, paginationSchema, searchSchema, sortSchema } from "@/server/validate";

export const runtime = "nodejs";

/**
 * GET /api/v1/agent/campaigns
 * Agent-browseable list of campaigns: active campaigns with enriched
 * assignment metadata ("Assigned" vs "Open" vs "Not assigned").
 * Exclusive campaigns are hidden unless assigned to the viewer.
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
  // Exclusives are invisible unless assigned to the viewer (agency or agent):
  // unassigned agents must not see exclusive offers anywhere, browse or portal.
  const enriched = filtered.flatMap((c) => {
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
    const isExclusive = (c as { is_exclusive?: boolean }).is_exclusive === true
      || (c as { visibility?: string }).visibility === "exclusive";
    if (isExclusive && !isAssigned) return [];
    let assignment_status: "Assigned" | "Open" | "Not assigned";
    if (isAssigned) assignment_status = "Assigned";
    else if (!hasAny) assignment_status = "Open";
    else assignment_status = "Not assigned";
    return [{
      ...payoutFree,
      assigned_agency_count: entry?.agencyCount ?? 0,
      assigned_agent_count: entry?.agentCount ?? 0,
      assignment_status,
      is_assigned_to_me: isAssigned,
      has_assignments: hasAny,
      is_live_for_me: liveSet.has(c.id),
    }];
  });

  // Totals are best-effort: endpoint/state filters plus hidden exclusives
  // shrink the visible set, so subtract everything removed on this page.
  let finalTotal = total;
  let finalTotalPages = Math.ceil(total / limit);
  if (enriched.length !== rows.length) {
    finalTotal = Math.max(0, total - (rows.length - enriched.length));
    finalTotalPages = Math.ceil(finalTotal / limit);
  }

  const pagination = { page, limit, total: finalTotal, totalPages: finalTotalPages };
  return paginated(enriched, pagination);
}, { resource: "calls", action: "view" });
