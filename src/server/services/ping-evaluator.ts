import { query, queryOne } from "@/server/db";
import { normalizeE164 } from "@/domain/phone";

export type PingRejectReason =
  | "unknown_campaign"
  | "campaign_paused"
  | "state_mismatch"
  | "no_agent_available";

export type PingDecision =
  | {
      decision: "accept";
      state: string | null;
      campaignId: string;
      agencyId: string;
      agentId: string;
    }
  | {
      decision: "reject";
      reason: PingRejectReason;
      state: string | null;
      campaignId: string | null;
    };

/**
 * Extracts the 3-digit NPA (area code) from a caller number. Returns null for
 * toll-free, non-NANP, or unparseable numbers.
 */
export function callerStateFromNumber(caller: string | null): string | null {
  if (!caller) return null;
  const e164 = normalizeE164(caller);
  if (!e164) return null;
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1, 4);
  return null;
}

// Static reference data (355 rows, changes ~never). Loaded once per process;
// avoids a per-ping DB round trip on the hot path.
let npaCache: Map<string, string> | null = null;

export async function loadNpaCache(): Promise<Map<string, string>> {
  if (!npaCache) {
    const rows = await query<{ npa: string; state: string }>(
      "SELECT npa, state FROM app.npa_states",
    );
    npaCache = new Map(rows.map((r) => [r.npa.trim(), r.state.trim()]));
  }
  return npaCache;
}

export async function resolveNpaState(npa: string): Promise<string | null> {
  const cache = await loadNpaCache();
  return cache.get(npa) ?? null;
}

interface PingCampaignRow {
  campaign_id: string;
  agency_id: string;
  status: string;
  target_states: string[] | null;
  effective_price_cents: number | null;
}

/**
 * Ping-first evaluation (client requirement): decide accept/reject BEFORE the
 * publisher forwards the call. Never hangs up anything — the publisher only
 * delivers the call after an accept.
 *
 * Checks in order:
 *  1. DID resolves to an active campaign (else unknown_campaign / campaign_paused)
 *  2. Caller state (3-digit NPA) is in the campaign's allowed states (else state_mismatch)
 *  3. An approved, available, not-busy agent exists whose states match (else no_agent_available)
 *
 * Latency: 1 JOIN query (phone + campaign) + 1 agent query. NPA lookup is an
 * in-memory cache. Target <300ms.
 */
export async function evaluatePing(input: {
  did: string;
  caller: string | null;
}): Promise<PingDecision> {
  const e164Did = normalizeE164(input.did);
  if (!e164Did) return { decision: "reject", reason: "unknown_campaign", state: null, campaignId: null };

  const phone = await queryOne<PingCampaignRow>(
    `SELECT c.id AS campaign_id, c.agency_id, c.status, c.target_states,
            COALESCE(bo.price_cents, c.price_cents) AS effective_price_cents
     FROM app.phone_numbers pn
     JOIN app.campaigns c ON c.id = pn.campaign_id
     LEFT JOIN app.bid_overrides bo ON bo.campaign_id = c.id
     WHERE pn.e164 = $1 AND pn.status = 'active'`,
    [e164Did],
  );
  if (!phone) return { decision: "reject", reason: "unknown_campaign", state: null, campaignId: null };
  if (phone.status !== "active") {
    return { decision: "reject", reason: "campaign_paused", state: null, campaignId: phone.campaign_id };
  }

  const npa = callerStateFromNumber(input.caller);
  const state = npa ? await resolveNpaState(npa) : null;

  const allowedStates = phone.target_states ?? [];
  if (allowedStates.length > 0 && (!state || !allowedStates.includes(state))) {
    return { decision: "reject", reason: "state_mismatch", state, campaignId: phone.campaign_id };
  }

  const priceCents = phone.effective_price_cents ?? 10;
  const params: unknown[] = [phone.agency_id];
  const clauses: string[] = [];
  if (state) {
    params.push(state);
    clauses.push(`AND (COALESCE(array_length(a.states, 1), 0) = 0 OR $2 = ANY(a.states))`);
  }
  // Call-readiness gate (client Q2): wallet covers the price OR an active
  // subscription with remaining allowance. Unfunded agents are never ping targets.
  params.push(priceCents);
  clauses.push(`AND (
      (SELECT COALESCE(SUM(we.amount_cents), 0) FROM app.wallet_entries we WHERE we.agent_id = a.id) >= $${params.length}
      OR EXISTS (
        SELECT 1 FROM app.agent_subscriptions s
        JOIN app.agent_plans p ON p.id = s.plan_id
        WHERE s.agent_id = a.id AND s.status = 'active'
          AND (s.end_date IS NULL OR s.end_date > now())
          AND s.calls_used < p.call_allowance
      )
      OR $${params.length} <= 0
    )`);
  const agent = await queryOne<{ id: string }>(
    `SELECT a.id
     FROM app.agents a
     WHERE a.agency_id = $1
       AND a.approval_status = 'approved'
       AND a.availability = 'available'
       ${clauses.join("\n       ")}
       AND NOT EXISTS (
         SELECT 1 FROM app.calls c
         WHERE c.agent_id = a.id
           AND c.state IN ('ringing','connecting','connected')
       )
     ORDER BY a.priority ASC, a.last_assigned_at ASC NULLS FIRST
     LIMIT 1`,
    params,
  );
  if (!agent) {
    return { decision: "reject", reason: "no_agent_available", state, campaignId: phone.campaign_id };
  }

  return {
    decision: "accept",
    state,
    campaignId: phone.campaign_id,
    agencyId: phone.agency_id,
    agentId: agent.id,
  };
}
