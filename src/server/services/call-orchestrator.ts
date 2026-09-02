import { calls, agents, campaigns, phoneNumbers, dispositions, dispositionPayouts, agentSubscriptions, walletEntries, campaignAssignments, bidOverrides } from "@/server/repositories";
import { transaction, query } from "@/server/db";
import { getTelephonyProvider } from "@/server/telephony-registry";
import { selectAgent } from "@/domain/routing";
import { assertTransition, isTerminal } from "@/domain/calls";
import { calculateBilling } from "@/server/services/billing";
import { publishCallEvent } from "@/lib/event-bridge";
import { hashPhone } from "@/domain/phone";
import { callerStateFromNumber, resolveNpaState } from "@/server/services/ping-evaluator";
import { enqueueRouteCall, isAsyncRoutingEnabled } from "@/server/services/route-queue";
import { enqueueFinalizeCall } from "@/server/services/finalize-queue";
import { enqueueRecordingStore } from "@/server/services/recording-store";
import type { LedgerType } from "@/domain/ledger";
import type { NormalizedProviderEvent } from "@/domain/telephony";
import type { PoolClient } from "pg";

const PII_KEYS = /^(from|to|caller_number|caller_name|phone_number|number|ani|dnis)$/i;

/**
 * Removes caller PII from a raw provider webhook before persisting to
 * call_events.raw_redacted. Structure is preserved (recording ids etc. stay
 * readable for backfill scripts); only identity-bearing fields are masked.
 */
function redactWebhook(raw: Record<string, unknown>): Record<string, unknown> {
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (PII_KEYS.test(k)) { out[k] = "[redacted]"; continue; }
        out[k] = walk(v);
      }
      return out;
    }
    return value;
  };
  return walk(raw) as Record<string, unknown>;
}

export async function processProviderEvent(event: NormalizedProviderEvent) {
  const t0 = Date.now();
  return transaction(async (client) => {
    // Agent-leg events carry the internal callId (decoded from client_state).
    let call = event.callId
      ? await calls.findById(event.callId, undefined, client).catch(() => null)
      : await calls.findByProviderCallId(event.provider, event.providerCallId, client);

    if (!call && event.type === "inbound") {
      // Outbound (agent) legs echo back their own call.initiated — never create calls for them.
      if (event.callId) return null;
      const fromHash = event.from ? hashPhone(event.from) : null;
      const npa = callerStateFromNumber(event.from ?? null);
      const callerState = npa ? await resolveNpaState(npa) : null;

      // Fire the early-answer IMMEDIATELY and do not await it — the Telnyx API
      // round trip (~200-500ms) must not sit on the webhook hot path. It still
      // prevents the originator's answer supervision from cancelling the call
      // while we route; the caller hears silence until bridged.
      let answerPromise: Promise<unknown> = Promise.resolve();
      try {
        const provider = getTelephonyProvider(event.provider);
        answerPromise = provider.answer({ callId: event.providerCallId }).catch((e: any) => {
          console.error(`[processProviderEvent] early-answer failed for ${String(event.providerCallId).slice(0,12)}: ${e?.message ?? e}`);
        });
      } catch (e: any) {
        console.error(`[processProviderEvent] no provider for early-answer: ${e?.message ?? e}`);
      }

      // Resolve agency and campaign from the destination phone number
      let agencyId: string | null = null;
      let campaignId: string | null = null;
      if (event.to) {
        const phone = await phoneNumbers.findByE164(event.to, client);
        if (phone) {
          agencyId = phone.agency_id;
          campaignId = phone.campaign_id;
        } else {
          console.warn(`[processProviderEvent] unknown DID ${event.to.slice(0,12)}..., falling back to first active phone`);
          // Fallback: first active phone (masked DIDs break exact match)
          const fallback = await client.query(`SELECT agency_id, campaign_id FROM app.phone_numbers WHERE status='active' LIMIT 1`);
          if (fallback.rows[0]) {
            agencyId = fallback.rows[0].agency_id;
            campaignId = fallback.rows[0].campaign_id;
          }
        }
      }
      if (!agencyId || !campaignId) {
        // Still no match — use first agency/campaign so webhook never 400s on UUID
        const fallback = await client.query(`SELECT agency_id, campaign_id FROM app.phone_numbers WHERE status='active' LIMIT 1`);
        if (fallback.rows[0]) {
          agencyId = fallback.rows[0].agency_id;
          campaignId = fallback.rows[0].campaign_id;
        } else {
          const ag = await client.query(`SELECT id FROM app.agencies LIMIT 1`);
          const camp = await client.query(`SELECT id FROM app.campaigns LIMIT 1`);
          if (ag.rows[0] && camp.rows[0]) {
            agencyId = ag.rows[0].id;
            campaignId = camp.rows[0].id;
          } else {
            throw new Error(`No phone/agency/campaign to route DID ${event.to ?? "unknown"}`);
          }
        }
      }

      call = await calls.create({
        agency_id: agencyId,
        campaign_id: campaignId,
        provider: event.provider,
        provider_call_id: event.providerCallId,
      }, client);
      call = await calls.updateState(call.id, "received", agencyId, {
        from_hash: fromHash,
        to_number: event.to ?? null,
        caller_state: callerState,
        started_at: event.occurredAt,
      }, client);

      // Let the answer finish in the background while routing proceeds.
      void answerPromise;
    }

    if (!call) return null;

    // If call is already in a terminal state, just log the event and return
    if (isTerminal(call.state as any)) {
      return { call };
    }

    await client.query(
      `INSERT INTO app.call_events (agency_id, call_id, provider, provider_event_id, type, raw_redacted, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (provider, provider_event_id) DO NOTHING`,
      [call.agency_id, call.id, event.provider, event.eventId, event.type, JSON.stringify(redactWebhook(event.raw)), event.occurredAt],
    );

    if (event.type === "inbound") {
      // If call was already created by a duplicate event, skip routing
      if (call.state !== "received" && call.state !== "validating" && call.state !== "routing") {
        return { call };
      }
      assertTransition(call.state as any, "validating");
      call = await calls.updateState(call.id, "validating", call.agency_id, undefined, client);
      assertTransition("validating", "routing");
      call = await calls.updateState(call.id, "routing", call.agency_id, undefined, client);
      // Optional async routing: return 202 immediately and let the worker's
      // route-call job do the (slow) agent selection + dialing. Best effort —
      // falls back to inline routing if the queue can't be reached.
      if (isAsyncRoutingEnabled()) {
        try {
          await enqueueRouteCall(call.id);
          console.info(JSON.stringify({ event: "routing_queued", callId: call.id.slice(0, 8), elapsedMs: Date.now() - t0 }));
          return { call, routingResult: { queued: true } };
        } catch (e: any) {
          console.error(`[processProviderEvent] async routing enqueue failed, falling back to inline: ${e?.message ?? e}`);
        }
      }
      const result = await routeCall(call.id, { client });
      console.info(JSON.stringify({ event: "routing_done", callId: call.id.slice(0, 8), elapsedMs: Date.now() - t0, selected: result.selected?.slice(0, 8) ?? null }));
      return { call, routingResult: result };
    }

    if (event.type === "ringing") {
      return { call };
    }

    if (event.type === "connected") {
      // We answer the caller leg immediately on inbound, so Telnyx echoes call.answered
      // while the call is still being routed — ignore those. Only a call already
      // "connecting" (agent accepted) may transition to connected here.
      if (call.state === "connecting") {
        assertTransition(call.state as any, "connected");
        call = await calls.updateState(call.id, "connected", call.agency_id, {
          connected_at: event.occurredAt,
        }, client);
      }
      return { call };
    }

    if (event.type === "ended") {
      if (call.state === "ringing") {
        if (event.callId) {
          // Agent leg ended while ringing (agent hung up / their leg failed) —
          // fail over to the next agent immediately; the caller keeps waiting.
          const reroute = await handleNoAnswer(call.id, "agent_ended", client);
          return { call, reroute };
        }
        // Caller hung up while ringing — kill the dialed agent leg too so it
        // doesn't keep ringing (phantom ring), then miss the call.
        try {
          const provider = getTelephonyProvider(call.provider);
          if (call.provider_agent_call_id) {
            await provider.cancel({ providerAttemptId: call.provider_agent_call_id });
          }
          await provider.cancel({ providerAttemptId: call.provider_call_id });
        } catch (e: any) {
          console.error(`[processProviderEvent] cancel legs failed: ${e?.message ?? e}`);
        }
        call = await calls.updateState(call.id, "missed", call.agency_id, { ended_at: event.occurredAt }, client);
      } else if (call.state === "routing") {
        // Caller hung up mid-routing — cancel any dialed agent leg (phantom
        // ring) plus the caller leg, then miss the call.
        try {
          const provider = getTelephonyProvider(call.provider);
          if (call.provider_agent_call_id) {
            await provider.cancel({ providerAttemptId: call.provider_agent_call_id });
          }
          await provider.cancel({ providerAttemptId: call.provider_call_id });
        } catch (e: any) {
          console.error(`[processProviderEvent] cancel legs failed: ${e?.message ?? e}`);
        }
        call = await calls.updateState(call.id, "missed", call.agency_id, { ended_at: event.occurredAt }, client);
      } else {
        // Claim-guarded terminal transition: concurrent ended webhooks (caller
        // leg + agent leg hangup arrive together) race here. Only the claim
        // winner finalizes — the loser must not re-run billing.
        assertTransition(call.state as any, "ended");
        const claimed = await calls.claimState(call.id, call.state, "ended", call.agency_id, {
          ended_at: event.occurredAt,
        }, client);
        if (!claimed) return { call, finalized: false };
        call = claimed;
      }
      if (call.agent_id) {
        const agent = await agents.findById(call.agent_id).catch(() => null);
        if (agent?.membership_id) {
          publishCallEvent(agent.membership_id, "call:ended", { callId: call.id });
        }
      }
      // Billing runs via the worker AFTER this transaction commits (the inline
      // call could not see the uncommitted ended state). On enqueue failure,
      // fall back to inline finalization using the outer client for visibility.
      try {
        await enqueueFinalizeCall(call.id);
        return { call, billing: { queued: true } };
      } catch (e: any) {
        console.error(`[processProviderEvent] finalize enqueue failed, finalizing inline: ${e?.message ?? e}`);
        const billing = await finalizeCall(call.id, client);
        return { call, billing };
      }
    }

    if (event.type === "recording_ready") {
      // The raw payload nests recording_id under data.payload (webhook v2).
      const rawPayload = (event.raw as any)?.data?.payload;
      const recordingId = typeof rawPayload?.recording_id === "string"
        ? rawPayload.recording_id
        : typeof (event.raw as any)?.recording_id === "string"
          ? (event.raw as any).recording_id
          : null;
      // Store the CALLER leg's recording — it captures the full bridged conversation.
      // Agent-leg recording events (callId present) are ignored.
      if (recordingId && !event.callId) {
        try {
          await enqueueRecordingStore({
            callId: call.id,
            agencyId: call.agency_id,
            provider: call.provider,
            recordingId,
            providerCallId: call.provider_call_id,
          });
        } catch (e: any) {
          console.error(`[recording_ready] enqueue failed for call=${call.id.slice(0,8)}: ${e?.message ?? e}`);
        }
      }
      return { call };
    }

    return { call };
  });
}

export async function routeCall(callId: string, options: { client?: PoolClient; excludeAgentIds?: string[] } = {}) {
  const { client, excludeAgentIds } = options;
  const call = await calls.findById(callId, undefined, client);
  if (!call) throw new Error(`Call ${callId} not found`);

  // Idempotency guard: only a call still in 'routing' may be dialed. A duplicate
  // or redelivered route-call job (pg-boss retry, overlapping workers) must never
  // dial a second agent.
  if (call.state !== "routing") {
    console.warn(`[routeCall] skip call=${callId.slice(0, 8)} state=${call.state} (not routing — duplicate/redelivered job)`);
    return { selected: null, claimed: false, snapshot: {} };
  }

  // Atomic claim BEFORE dialing: routing → ringing. The claim winner is the only
  // actor that may dial; losers (concurrent duplicates) bail here. ring_started_at
  // is set immediately so the orphan-ringer safety net (which only touches
  // ringing + agent IS NULL + stale) does not sweep the in-flight dial.
  const claim = await calls.claimState(call.id, "routing", "ringing", call.agency_id, {
    ring_started_at: new Date().toISOString(),
  }, client);
  if (!claim) {
    console.warn(`[routeCall] lost claim for call=${callId.slice(0, 8)} (state changed — duplicate job?)`);
    return { selected: null, claimed: false, snapshot: {} };
  }

  // Lookups. When running inside a transaction (client provided) the queries
  // MUST be sequential — node-postgres queues concurrent queries on one client
  // and pg@9 removes that behavior. On the pool (worker path) they parallelize.
  let campaign: Awaited<ReturnType<typeof campaigns.findById>> | null;
  let availableAgents: Awaited<ReturnType<typeof agents.findAvailable>>;
  let hasAssignments: boolean;
  let bidOverride: Awaited<ReturnType<typeof bidOverrides.findLatest>> | null;
  if (client) {
    campaign = await campaigns.findById(call.campaign_id, call.agency_id, client).catch(() => null);
    availableAgents = await agents.findAvailable(call.agency_id, client);
    hasAssignments = await campaignAssignments.hasAssignments(call.campaign_id, client);
    bidOverride = await bidOverrides.findLatest(call.campaign_id, client).catch(() => null);
  } else {
    [campaign, availableAgents, hasAssignments, bidOverride] = await Promise.all([
      campaigns.findById(call.campaign_id, call.agency_id).catch(() => null),
      agents.findAvailable(call.agency_id),
      campaignAssignments.hasAssignments(call.campaign_id),
      bidOverrides.findLatest(call.campaign_id).catch(() => null),
    ]);
  }

  let assignedAgencyIds: string[] = [];
  let assignedAgentIds: string[] = [];
  if (hasAssignments) {
    if (client) {
      assignedAgencyIds = await campaignAssignments.findAgencyIds(call.campaign_id, client);
      assignedAgentIds = await campaignAssignments.findAgentIds(call.campaign_id, client);
    } else {
      [assignedAgencyIds, assignedAgentIds] = await Promise.all([
        campaignAssignments.findAgencyIds(call.campaign_id),
        campaignAssignments.findAgentIds(call.campaign_id),
      ]);
    }
  }

  // Candidates came from findAvailable — reuse those rows for the selected
  // agent instead of refetching by id (one less query per call).
  const agentById = new Map(availableAgents.map((a) => [a.id, a]));

  // Call-readiness gate (client Q2): skip agents whose wallet can't cover the
  // campaign price; prepaid (wallet-funded) agents are tier 1 and get calls
  // FIRST, subscription-funded agents are tier 2.
  const priceCents = bidOverride?.price_cents ?? campaign?.price_cents ?? 10;
  const eligibilityRows = availableAgents.length > 0
    ? await query<{ id: string; wallet_cents: string; has_sub: boolean }>(
        `SELECT a.id,
                COALESCE((SELECT SUM(we.amount_cents) FROM app.wallet_entries we WHERE we.agent_id = a.id), 0)::text AS wallet_cents,
                EXISTS (
                  SELECT 1 FROM app.agent_subscriptions s
                  JOIN app.agent_plans p ON p.id = s.plan_id
                  WHERE s.agent_id = a.id AND s.status = 'active'
                    AND (s.end_date IS NULL OR s.end_date > now())
                    AND s.calls_used < p.call_allowance
                ) AS has_sub
         FROM app.agents a
         WHERE a.id = ANY($1::uuid[])`,
        [availableAgents.map((a) => a.id)],
        client,
      )
    : [];
  const eligibility = new Map(eligibilityRows.map((r) => [r.id, r]));

    const candidates = [];
    for (const a of availableAgents) {
      if (excludeAgentIds?.includes(a.id)) continue;
      if (hasAssignments && !assignedAgencyIds.includes(a.agency_id) && !assignedAgentIds.includes(a.id)) {
        continue;
      }
      const elig = eligibility.get(a.id);
      const walletFunded = Number(elig?.wallet_cents ?? 0) >= priceCents;
      const hasSub = Boolean(elig?.has_sub);
      candidates.push({
        id: a.id,
        approved: a.approval_status === "approved",
        available: a.availability === "available",
        busy: a.is_busy ?? false,
        walletEligible: priceCents <= 0 || walletFunded || hasSub,
        scheduleOpen: true,
        tier: walletFunded ? 1 : 2,
        states: a.states,
        licenses: a.licenses,
        skills: a.skills,
        endpointTypes: (a.endpoint_types as string[]).map(t => t === "phone" ? "pstn" : t) as Array<"webrtc" | "pstn">,
        priority: a.priority,
        roundRobinRank: a.last_assigned_at ? new Date(a.last_assigned_at).getTime() : 0,
      });
    }

    const routingRequest = {
    state: (call.caller_state as string | undefined) ?? campaign?.target_states?.[0] ?? "IL",
    requiredLicense: campaign?.required_license ?? undefined,
    requiredSkills: campaign?.required_skills ?? [],
    allowedEndpoints: (campaign?.allowed_endpoints ?? ["webrtc", "pstn"]) as Array<"webrtc" | "pstn">,
    strategy: (campaign?.routing_strategy ?? "priority") as "priority" | "round_robin",
  };

  const result = selectAgent(candidates, routingRequest);

  console.log(`[routeCall] call=${callId.slice(0,8)} agency=${call.agency_id.slice(0,8)} candidates=${candidates.length} eligible=${candidates.length - Object.keys(result.rejected).length} selected=${result.selected?.id?.slice(0,8) ?? "none"} rejected=${JSON.stringify(Object.entries(result.rejected).map(([id, reasons]) => ({id: id.slice(0,8), reasons})))} campaign=${campaign?.id?.slice(0,8) ?? "none"} strategy=${routingRequest.strategy}`);

  const snapshot = {
    strategy: routingRequest.strategy,
    selectedAgent: result.selected?.id ?? null,
    rejectedCount: Object.keys(result.rejected).length,
    rejectionReasons: result.rejected,
    candidateCount: candidates.length,
    triedAgentIds: excludeAgentIds ?? (call.routing_snapshot?.triedAgentIds as string[] | undefined) ?? [],
    timestamp: new Date().toISOString(),
  };

  if (result.selected) {
    const provider = getTelephonyProvider(call.provider);
    const selectedAgent = agentById.get(result.selected.id) ?? null;
    const epTypes = (selectedAgent?.endpoint_types ?? []) as string[];
    const isPhone = epTypes.includes("phone") || epTypes.includes("pstn");
    const isWebrtc = epTypes.includes("webrtc");
    let fromNumber = "";
    let toNumber = "";

    // One lookup for both branches — the campaign's caller-id number.
    let campaignPhone: { e164: string } | null = null;
    if (isPhone || isWebrtc) {
      try {
        campaignPhone = await phoneNumbers.findByCampaign(call.campaign_id, client);
        if (campaignPhone) fromNumber = campaignPhone.e164;
      } catch (e: any) { console.error("findByCampaign error:", e.message); }
    }
    if (isPhone && selectedAgent?.forwarding_number) toNumber = selectedAgent.forwarding_number;

    let ringResult = null;
    let ringError: string | null = null;
    if (isPhone && fromNumber && toNumber) {
      try {
        ringResult = await provider.ring({
          callId: call.id,
          agentId: result.selected.id,
          endpoint: "pstn",
          from: fromNumber,
          to: toNumber,
        });
      } catch (e: any) {
        ringError = e.message;
        console.error("ring() failed:", e.message);
      }
    } else if (isWebrtc) {
      const sipUser = process.env.TELNYX_WEBRTC_SIP_USER;
      const sipRealm = process.env.TELNYX_WEBRTC_SIP_REALM ?? "sip.telnyx.com";
      const toSip = `sip:${sipUser}@${sipRealm}`;
      if (sipUser && fromNumber) {
        try {
          ringResult = await provider.ring({
            callId: call.id,
            agentId: result.selected.id,
            endpoint: "webrtc",
            from: fromNumber,
            to: toSip,
          });
        } catch (e: any) {
          ringError = e.message;
          console.error("ring() webrtc failed:", e.message);
        }
      } else {
        ringError = sipUser ? "Campaign has no phone number" : "WebRTC SIP user not configured";
      }
    } else if (isPhone) {
      ringError = fromNumber ? "Agent has no forwarding number" : "Campaign has no phone number";
    }

    if (!ringResult) {
      // No agent leg was created — the caller (already answered) must not sit in silence.
      try {
        await provider.cancel({ providerAttemptId: call.provider_call_id });
      } catch (e: any) {
        console.error(`[routeCall] cancel caller leg failed: ${e?.message ?? e}`);
      }
      const failed = await calls.claimState(call.id, "ringing", "failed", call.agency_id, {
        agent_id: result.selected.id,
        routing_snapshot: { ...snapshot, ringError },
      }, client);
      // If the claim was lost the call already moved on (caller hung up) — no write.
      if (!failed) {
        console.warn(`[routeCall] ring failed but call ${callId.slice(0, 8)} already moved on (claim lost)`);
      }
      return { selected: result.selected.id, ringResult, snapshot: { ...snapshot, ringError } };
    }

    // Re-claim with the dialed details. If the call moved on while we dialed
    // (caller hung up → missed, failover claimed → routing), cancel the just-
    // dialed agent leg so it can't keep ringing a phantom.
    const attached = await calls.claimState(call.id, "ringing", "ringing", call.agency_id, {
      agent_id: result.selected.id,
      provider_agent_call_id: ringResult?.providerAttemptId ?? null,
      routing_snapshot: { ...snapshot, ringError },
      ring_started_at: new Date().toISOString(),
    }, client);
    if (!attached) {
      try {
        await provider.cancel({ providerAttemptId: ringResult?.providerAttemptId as string });
      } catch (e: any) {
        console.error(`[routeCall] cancel newly dialed agent leg failed: ${e?.message ?? e}`);
      }
      console.warn(`[routeCall] call ${callId.slice(0, 8)} moved on during dial — agent leg cancelled`);
      return { selected: result.selected.id, ringResult, claimed: false, snapshot: { ...snapshot, ringError } };
    }

    if (selectedAgent?.membership_id) {
      publishCallEvent(selectedAgent.membership_id, "call:ringing", {
        callId: call.id,
        campaignId: call.campaign_id,
        fromHash: call.from_hash,
        callerState: call.caller_state ?? null,
      });
    }

    // Update last_assigned_at for round-robin ordering
    try {
      await agents.update(result.selected.id, { last_assigned_at: new Date().toISOString() }, call.agency_id, client);
    } catch { /* non-critical */ }

    return { selected: result.selected.id, ringResult, snapshot: { ...snapshot, ringError } };
  }

  // No eligible agent — hang up the caller leg (it was answered during inbound handling)
  try {
    const provider = getTelephonyProvider(call.provider);
    await provider.cancel({ providerAttemptId: call.provider_call_id });
  } catch (e: any) {
    console.error(`[routeCall] cancel caller leg failed: ${e?.message ?? e}`);
  }

  const missed = await calls.claimState(call.id, "ringing", "missed", call.agency_id, {
    routing_snapshot: { ...snapshot, noEligible: true },
  }, client);
  if (!missed) {
    // Call already moved on (caller hung up) — the webhook handled the cleanup.
    console.warn(`[routeCall] no agent but call ${callId.slice(0, 8)} already moved on (claim lost)`);
  }

  return { selected: null, snapshot };
}

export type NoAnswerReason = "timeout" | "rejected" | "agent_ended";

/**
 * Shared failover for a ringing call whose agent will not pick up.
 * Cancels the ringing agent leg (no phantom ring), tells that agent the call
 * moved on, then either re-routes to the next eligible agent (excluding
 * everyone already tried) or — once campaign.max_ring_attempts is hit —
 * hangs up the caller and marks the call missed.
 */
export async function handleNoAnswer(callId: string, reason: NoAnswerReason, client?: PoolClient) {
  const call = await calls.findById(callId, undefined, client);
  if (!call || call.state !== "ringing") return null;
  const provider = getTelephonyProvider(call.provider);
  const campaign = await campaigns.findById(call.campaign_id, call.agency_id, client).catch(() => null);
  const maxAttempts = campaign?.max_ring_attempts ?? 2;
  const snapshot = (call.routing_snapshot ?? {}) as Record<string, unknown>;
  const tried = new Set<string>((call.routing_snapshot?.triedAgentIds as string[] | undefined) ?? []);
  if (call.agent_id) tried.add(call.agent_id);

  // The agent leg is done ringing — cancel it so the agent isn't left with a phantom ring.
  if (call.provider_agent_call_id) {
    try {
      await provider.cancel({ providerAttemptId: call.provider_agent_call_id });
    } catch (e: any) {
      console.error(`[handleNoAnswer] cancel agent leg failed for call=${call.id.slice(0, 8)}: ${e?.message ?? e}`);
    }
  }

  // Tell the previous agent the call moved on so their softphone clears.
  if (call.agent_id) {
    const agent = await agents.findById(call.agent_id).catch(() => null);
    if (agent?.membership_id) {
      publishCallEvent(agent.membership_id, "call:ended", { callId: call.id });
    }
  }

  const nextSnapshot = { ...snapshot, triedAgentIds: [...tried], noAnswerReason: reason };

  if (tried.size >= maxAttempts) {
    // Out of attempts — hang up the (already answered) caller leg and miss it.
    try {
      await provider.cancel({ providerAttemptId: call.provider_call_id });
    } catch (e: any) {
      console.error(`[handleNoAnswer] cancel caller leg failed for call=${call.id.slice(0, 8)}: ${e?.message ?? e}`);
    }
    const finalClaim = await calls.claimState(call.id, "ringing", "missed", call.agency_id, {
      ended_at: new Date().toISOString(),
      routing_snapshot: nextSnapshot,
    }, client);
    if (!finalClaim) return null; // another actor already moved the call — nothing to do
    return { rerouted: false, attempts: tried.size, reason };
  }

  // Re-route to the next eligible agent, excluding everyone already tried.
  // Atomic claim: with overlapping failovers (timeout sweep + agent hangup +
  // reject) only the claim winner proceeds to re-dial; losers return null.
  const claimed = await calls.claimState(call.id, "ringing", "routing", call.agency_id, {
    agent_id: null,
    provider_agent_call_id: null,
    routing_snapshot: nextSnapshot,
  }, client);
  if (!claimed) return null;
  const result = await routeCall(call.id, { client, excludeAgentIds: [...tried] });
  return { rerouted: true, attempts: tried.size, reason, result };
}

export async function finalizeCall(callId: string, client?: PoolClient) {
  const call = await calls.findById(callId, undefined, client);
  if (!call || call.state !== "ended") return null;

  const campaign = await campaigns.findById(call.campaign_id).catch(() => null);
  const bidOverride = await bidOverrides.findLatest(call.campaign_id).catch(() => null);
  const bufferSeconds = campaign?.buffer_seconds ?? 30;
  // Manual bid override applies immediately (client Q2/Q4): admin bid wins over the campaign price.
  const pricePerSecondCents = bidOverride?.price_cents ?? campaign?.price_cents ?? 10;
  const minConnectedSeconds = campaign?.min_connected_seconds ?? 0;

  const connectedSeconds = call.connected_at && call.ended_at
    ? Math.round((new Date(call.ended_at).getTime() - new Date(call.connected_at).getTime()) / 1000)
    : 0;

  // Confirmed disposition → payout instead of per-second billing
  const disposition = await dispositions.findByCallId(call.id);
  let dispositionAmountCents = 0;
  if (disposition?.admin_confirmed) {
    const payouts = await dispositionPayouts.findByAgency(call.agency_id);
    dispositionAmountCents = payouts.find((p) => p.outcome === disposition.outcome)?.amount_cents ?? 0;
  }
  const dispositionBased = Boolean(disposition?.admin_confirmed);

  let totalCents = 0;
  if (dispositionBased) {
    totalCents = dispositionAmountCents;
  } else if (connectedSeconds < minConnectedSeconds) {
    totalCents = 0;
  } else {
    totalCents = calculateBilling(connectedSeconds, bufferSeconds, pricePerSecondCents).totalCents;
  }

  return transaction(async (client) => {
    // IDEMPOTENCY ANCHOR: only the first finalize per call creates the invoice.
    // Every money movement below runs exclusively inside this winner branch, so
    // duplicate/redelivered finalize jobs can never double-bill.
    const invoiceResult = await client.query(
      `INSERT INTO app.invoices (agency_id, call_id, total_cents, currency, status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (call_id) DO NOTHING
       RETURNING *`,
      [call.agency_id, call.id, totalCents, "USD", "paid"],
    );

    if (invoiceResult.rows.length === 0) {
      return { skipped: true, reason: "already_finalized", totalCents, connectedSeconds };
    }
    const invoice = invoiceResult.rows[0];

    // Agent pays per call (subscription allowance or wallet credit).
    if (call.agent_id) {
      await deductAgentForCall(call.agent_id, call.agency_id, call.id, client);
    }

    // Balance gate only for per-second charges. Never throws: an underfunded
    // agency gets a failed invoice and a terminal call — no rollback, no retry loop.
    if (!dispositionBased && totalCents > 0) {
      const balanceResult = await client.query(
        "SELECT COALESCE(SUM(amount_cents), 0) as balance FROM app.wallet_entries WHERE agency_id = $1",
        [call.agency_id],
      );
      const balance = Number(balanceResult.rows[0]?.balance ?? 0);
      if (balance < totalCents) {
        await client.query(
          "UPDATE app.invoices SET status = 'failed' WHERE id = $1",
          [invoice.id],
        );
        return {
          invoice: { ...invoice, status: "failed" },
          totalCents,
          connectedSeconds,
          bufferSeconds,
          insufficientBalance: true,
        };
      }
    }

    if (dispositionBased && totalCents > 0) {
      await client.query(
        `INSERT INTO app.wallet_entries (agency_id, type, amount_cents, currency, call_id, provider_reference, idempotency_key)
         VALUES ($1, $2::app.ledger_type, $3, $4, $5, $6, $7)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [call.agency_id, "disposition_payout", totalCents, "USD", call.id, `disposition_${disposition!.id}`, `payout_${disposition!.id}`],
      );
    } else if (totalCents > 0) {
      await client.query(
        `INSERT INTO app.wallet_entries (agency_id, type, amount_cents, currency, call_id, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [call.agency_id, "charge", -totalCents, "USD", call.id, `charge_${call.id}`],
      );
    }

    return { invoice, totalCents, connectedSeconds, bufferSeconds, dispositionBased };
  });
}

async function deductAgentForCall(agentId: string, agencyId: string, callId: string, client?: PoolClient) {
  const sub = await agentSubscriptions.findActiveByAgent(agentId);
  if (sub) {
    await agentSubscriptions.incrementCallsUsed(sub.id, callId, client);
  } else {
    const bal = await walletEntries.sumByAgent(agentId);
    if (bal > 0) {
      await walletEntries.create({
        agency_id: agencyId,
        agent_id: agentId,
        type: "charge",
        amount_cents: -100,
        call_id: callId,
        idempotency_key: `agent_charge_${callId}`,
      }, client);
    }
  }
}

export async function acceptCall(callId: string) {
  const startedAt = Date.now();
  let call = await calls.findById(callId);
  if (!call) return null;
  if (call.state !== "ringing") return call;
  const provider = getTelephonyProvider(call.provider);
  const agentCallId = call.provider_agent_call_id;
  console.log(`[acceptCall] call=${callId.slice(0,8)} state=${call.state} agentCallId=${agentCallId?.slice(0,12)??"null"} provider_call_id=${call.provider_call_id.slice(0,12)}`);
  if (agentCallId) {
    try {
      console.log(`[acceptCall] bridging agent=${agentCallId.slice(0,12)} to caller=${call.provider_call_id.slice(0,12)}`);
      const bridgeStart = Date.now();
      await provider.bridge({ callId: call.provider_call_id, providerAttemptId: agentCallId });
      console.log(`[acceptCall] bridge succeeded in ${Date.now() - bridgeStart}ms (accept total ${Date.now() - startedAt}ms)`);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const isNotAnsweredYet = msg.includes("90034") || msg.includes("not been answered") || msg.includes("Call not answered");
      if (isNotAnsweredYet) {
        console.warn(`[acceptCall] bridge not ready (agent not answered yet) for ${callId.slice(0,8)} — retrying after answer...`);
        // For WebRTC: the SDK answer may still be in-flight. Wait briefly and retry once.
        // Also try to answer the agent leg via Call Control in case SDK hasn't.
        try { await provider.answer({ callId: agentCallId }); } catch {}
        await new Promise((r) => setTimeout(r, 800));
        try {
          await provider.bridge({ callId: call.provider_call_id, providerAttemptId: agentCallId });
          console.log(`[acceptCall] bridge retry succeeded for ${callId.slice(0,8)}`);
        } catch (e2: any) {
          console.error(`[acceptCall] bridge RETRY FAILED for call=${callId.slice(0,8)}: ${e2?.message ?? e2}`);
          try { await provider.cancel({ providerAttemptId: call.provider_call_id }); } catch {}
          try { await provider.cancel({ providerAttemptId: agentCallId }); } catch {}
          await calls.updateState(call.id, "missed", call.agency_id, { ended_at: new Date().toISOString() });
          if (call.agent_id) {
            const agent = await agents.findById(call.agent_id).catch(() => null);
            if (agent?.membership_id) {
              publishCallEvent(agent.membership_id, "call:ended", { callId: call.id });
            }
          }
          return null;
        }
      } else {
        console.error(`[acceptCall] bridge FAILED for call=${callId.slice(0,8)} after ${Date.now() - startedAt}ms: ${msg}`);
        // One of the legs is gone (e.g. originator cancelled) — hang up both and finalize as missed.
        try { await provider.cancel({ providerAttemptId: call.provider_call_id }); } catch {}
        try { await provider.cancel({ providerAttemptId: agentCallId }); } catch {}
        await calls.updateState(call.id, "missed", call.agency_id, { ended_at: new Date().toISOString() });
        if (call.agent_id) {
          const agent = await agents.findById(call.agent_id).catch(() => null);
          if (agent?.membership_id) {
            publishCallEvent(agent.membership_id, "call:ended", { callId: call.id });
          }
        }
        return null;
      }
    }
  } else {
    console.error(`[acceptCall] no agent leg for call=${callId.slice(0,8)} — hanging up caller`);
    try { await provider.cancel({ providerAttemptId: call.provider_call_id }); } catch {}
    await calls.updateState(call.id, "failed", call.agency_id, { ended_at: new Date().toISOString() });
    return null;
  }
  call = await calls.updateState(call.id, "connected", call.agency_id, {
    connected_at: new Date().toISOString(),
  });
  if (call.agent_id) {
    const agent = await agents.findById(call.agent_id);
    if (agent?.membership_id) {
      publishCallEvent(agent.membership_id, "call:connected", { callId: call.id });
    }
  }
  return call;
}

export async function rejectCall(callId: string) {
  const call = await calls.findById(callId);
  if (!call || call.state !== "ringing") return null;
  // Server-side reject: cancel the agent leg and fail over to the next agent
  // (or hang up the caller once attempts are exhausted).
  return handleNoAnswer(callId, "rejected");
}

export async function hangupCall(callId: string) {
  const call = await calls.findById(callId);
  if (!call || (call.state !== "connected" && call.state !== "ringing")) return null;
  const provider = getTelephonyProvider(call.provider);
  if (call.state === "ringing" && call.provider_agent_call_id) {
    // Also cancel the ringing agent leg — no phantom ring.
    try { await provider.cancel({ providerAttemptId: call.provider_agent_call_id }); } catch { /* already gone */ }
  }
  await provider.cancel({ providerAttemptId: call.provider_call_id });
  await calls.updateState(call.id, "ended", call.agency_id, {
    ended_at: new Date().toISOString(),
  });
  if (call.agent_id) {
    const agent = await agents.findById(call.agent_id);
    if (agent?.membership_id) {
      publishCallEvent(agent.membership_id, "call:ended", { callId: call.id });
    }
  }
  const billing = await finalizeCall(call.id);
  return { call, billing };
}
