import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockProvider } from "@/domain/telephony";

const {
  updateStateMock, findByIdMock, findByProviderCallIdMock, createMock, cancelMock, enqueueRecordingMock, claimStateMock,
  findAvailableMock, campaignFindByIdMock, findLiveAgentIdsMock, findByE164Mock, findByCampaignMock, updateMock, speakMock,
} = vi.hoisted(() => ({
  updateStateMock: vi.fn(),
  findByIdMock: vi.fn(),
  findByProviderCallIdMock: vi.fn(),
  createMock: vi.fn(),
  cancelMock: vi.fn(),
  enqueueRecordingMock: vi.fn(),
  claimStateMock: vi.fn(),
  updateMock: vi.fn(),
  speakMock: vi.fn(async () => undefined),
  findAvailableMock: vi.fn().mockResolvedValue([]),
  campaignFindByIdMock: vi.fn().mockResolvedValue(null),
  findLiveAgentIdsMock: vi.fn().mockResolvedValue(null),
  findByE164Mock: vi.fn().mockResolvedValue(null),
  findByCampaignMock: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/server/db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  query: vi.fn().mockResolvedValue([]),
  queryOne: vi.fn().mockResolvedValue(null),
  transaction: vi.fn(async (fn: (client: any) => Promise<unknown>) =>
    fn({ query: vi.fn(async () => ({ rows: [{ balance: 100000 }] })) })),
}));

vi.mock("@/server/telephony-registry", () => ({
  getTelephonyProvider: vi.fn(() => ({ ...mockProvider, cancel: cancelMock, speak: speakMock })),
}));

vi.mock("@/server/services/recording-store", () => ({
  enqueueRecordingStore: enqueueRecordingMock,
}));

vi.mock("@/server/services/finalize-queue", () => ({
  enqueueFinalizeCall: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/repositories", () => ({
  calls: {
    findById: findByIdMock,
    findByProviderCallId: findByProviderCallIdMock,
    create: createMock,
    updateState: updateStateMock,
    update: updateMock,
    claimState: claimStateMock,
  },
  agents: {
    findById: vi.fn().mockResolvedValue(null),
    findAvailable: findAvailableMock,
    update: vi.fn(),
  },
  campaigns: { findById: campaignFindByIdMock },
  bidOverrides: { findLatest: vi.fn().mockResolvedValue(null) },
  agentCampaignSelections: {
    findLiveAgentIds: findLiveAgentIdsMock,
    getLiveCampaignIds: vi.fn().mockResolvedValue([]),
    isLive: vi.fn().mockResolvedValue(false),
    setLive: vi.fn(),
  },
  phoneNumbers: { findByE164: findByE164Mock, findByCampaign: findByCampaignMock },
  memberships: {},
  recordings: { findByCallId: vi.fn().mockResolvedValue(null), create: vi.fn() },
  dispositions: { findByCallId: vi.fn().mockResolvedValue(null) },
  dispositionPayouts: { findByAgency: vi.fn().mockResolvedValue([]) },
  agentSubscriptions: { findActiveByAgent: vi.fn(), incrementCallsUsed: vi.fn() },
  walletEntries: {},
  campaignAssignments: {
    hasAssignments: vi.fn().mockResolvedValue(false),
    findAgencyIds: vi.fn().mockResolvedValue([]),
    findAgentIds: vi.fn().mockResolvedValue([]),
  },
}));

const { processProviderEvent, routeCall, handleNoAnswer } = await import("@/server/services/call-orchestrator");

function makeCall(overrides: Record<string, unknown> = {}) {
  return {
    id: "call-1",
    agency_id: "agency-1",
    campaign_id: "campaign-1",
    agent_id: null,
    provider: "mock",
    provider_call_id: "caller-leg-1",
    provider_agent_call_id: null,
    state: "ringing",
    from_hash: null,
    started_at: "2026-01-01T00:00:00Z",
    connected_at: null,
    ended_at: null,
    routing_snapshot: {},
    qualification_snapshot: {},
    ...overrides,
  };
}

function agentLegEvent(type: "inbound" | "ringing" | "connected" | "ended", callId: string, providerCallId: string) {
  return {
    provider: "mock",
    eventId: `evt-${Date.now()}-${Math.random()}`,
    type,
    providerCallId,
    occurredAt: "2026-01-01T00:00:05Z",
    raw: {},
    callId,
    agentId: "agent-1",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  updateStateMock.mockImplementation((id: string, state: string, _agencyId: string, extra: Record<string, unknown> = {}) =>
    Promise.resolve(makeCall({ ...extra, state })),
  );
  // Claims succeed by default (return the claimed row); individual tests
  // override with null to simulate a lost claim (duplicate/overlapping actor).
  claimStateMock.mockImplementation((id: string, from: string, to: string, _agencyId: string, extra: Record<string, unknown> = {}) =>
    Promise.resolve(makeCall({ ...extra, state: to })),
  );
});

describe("processProviderEvent — recording_ready", () => {
  function recordingEvent(overrides: Record<string, unknown> = {}) {
    return {
      provider: "mock",
      eventId: "evt-rec",
      type: "recording_ready" as const,
      providerCallId: "caller-leg-1",
      occurredAt: "2026-01-01T00:00:20Z",
      raw: { data: { payload: { recording_id: "rec-1" } } },
      ...overrides,
    };
  }

  it("enqueues recording storage for the caller leg (v2 raw nesting)", async () => {
    findByProviderCallIdMock.mockResolvedValue(makeCall());

    await processProviderEvent(recordingEvent());

    expect(enqueueRecordingMock).toHaveBeenCalledWith({
      callId: "call-1",
      agencyId: "agency-1",
      provider: "mock",
      recordingId: "rec-1",
      providerCallId: "caller-leg-1",
    });
  });

  it("ignores agent-leg recording events (callId present)", async () => {
    findByIdMock.mockResolvedValue(makeCall());

    await processProviderEvent(recordingEvent({ callId: "call-1", agentId: "agent-1", providerCallId: "agent-leg-1" }));

    expect(enqueueRecordingMock).not.toHaveBeenCalled();
  });

  it("does nothing when the raw payload has no recording_id", async () => {
    findByProviderCallIdMock.mockResolvedValue(makeCall());

    await processProviderEvent(recordingEvent({ raw: { data: { payload: {} } } }));

    expect(enqueueRecordingMock).not.toHaveBeenCalled();
  });

  it("does not fail the webhook when the queue is unavailable", async () => {
    findByProviderCallIdMock.mockResolvedValue(makeCall());
    enqueueRecordingMock.mockRejectedValue(new Error("queue down"));

    const result = await processProviderEvent(recordingEvent());

    expect(result).toBeTruthy();
  });
});

describe("processProviderEvent — agent leg handling", () => {
  it("marks the call missed and cancels the caller leg when the agent leg hangs up while ringing", async () => {
    // processProviderEvent loads (ringing, agent-1), handleNoAnswer loads again
    // (ringing, agent-1), then the inline failover routeCall loads (routing).
    findByIdMock
      .mockResolvedValueOnce(makeCall({ agent_id: "agent-1" }))
      .mockResolvedValueOnce(makeCall({ agent_id: "agent-1" }))
      .mockResolvedValueOnce(makeCall({ state: "routing" }));

    const result = await processProviderEvent(agentLegEvent("ended", "call-1", "agent-leg-1"));

    // Best-effort re-route found no candidates → missed via the ringing→missed claim.
    expect(claimStateMock).toHaveBeenCalledWith("call-1", "ringing", "missed", "agency-1", expect.anything(), expect.anything());
    expect(cancelMock).toHaveBeenCalledWith({ providerAttemptId: "caller-leg-1" });
    expect(createMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it("marks the call missed and cancels the caller leg when the CALLER hangs up while ringing", async () => {
    findByProviderCallIdMock.mockResolvedValue(makeCall());

    await processProviderEvent({
      provider: "mock", eventId: "evt-caller-hangup", type: "ended",
      providerCallId: "caller-leg-1", occurredAt: "2026-01-01T00:00:05Z", raw: {},
    });

    expect(updateStateMock).toHaveBeenCalledWith("call-1", "missed", "agency-1", expect.any(Object), expect.anything());
    expect(cancelMock).toHaveBeenCalledWith({ providerAttemptId: "caller-leg-1" });
  });

  it("stamps agent_answered_at (no state change) when the AGENT leg answers while ringing", async () => {
    findByIdMock.mockResolvedValue(makeCall({ agent_id: "agent-1", provider_agent_call_id: "agent-leg-1" }));

    const result = await processProviderEvent(agentLegEvent("connected", "call-1", "agent-leg-1"));

    expect(updateStateMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(
      "call-1",
      { routing_snapshot: expect.objectContaining({ agent_answered_at: "2026-01-01T00:00:05Z" }) },
      "agency-1",
      expect.anything(),
    );
    expect(result).toBeTruthy();
  });

  it("ignores caller-leg connected echoes while ringing (no stamp)", async () => {
    findByIdMock.mockResolvedValue(makeCall({ agent_id: "agent-1", provider_agent_call_id: "agent-leg-1" }));

    const result = await processProviderEvent(agentLegEvent("connected", "call-1", "caller-leg-1"));

    expect(updateStateMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it("replays the holding message when failing over to the next agent", async () => {
    // Agent leg hangs up while ringing with attempts left: failover re-dials,
    // and the caller (waiting through a second cycle) hears the message again.
    findByIdMock
      .mockResolvedValueOnce(makeCall({ agent_id: "agent-1" }))
      .mockResolvedValueOnce(makeCall({ agent_id: "agent-1" }))
      .mockResolvedValueOnce(makeCall({ state: "routing" }));
    speakMock.mockClear();

    await processProviderEvent(agentLegEvent("ended", "call-1", "agent-leg-1"));

    expect(speakMock).toHaveBeenCalledWith(
      expect.objectContaining({ callId: "caller-leg-1", text: expect.stringContaining("continue to hold") }),
    );
  });

  it("leaves a ringing call alone on audio-lifecycle echoes (speak.started normalizes to ringing)", async () => {
    findByIdMock.mockResolvedValue(makeCall({ agent_id: "agent-1", provider_agent_call_id: "agent-leg-1" }));

    const result = await processProviderEvent(agentLegEvent("ringing", "call-1", "agent-leg-1"));

    expect(cancelMock).not.toHaveBeenCalled();
    expect(updateStateMock).not.toHaveBeenCalled();
    expect(claimStateMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it("ends the call normally when the agent leg hangs up while connected", async () => {
    findByIdMock.mockResolvedValue(makeCall({ state: "connected", connected_at: "2026-01-01T00:00:10Z" }));
    findByProviderCallIdMock.mockResolvedValue(null);
    claimStateMock.mockResolvedValue(makeCall({ state: "ended", ended_at: "2026-01-01T00:00:10Z" }));

    const result = await processProviderEvent(agentLegEvent("ended", "call-1", "agent-leg-1"));

    expect(claimStateMock).toHaveBeenCalledWith("call-1", "connected", "ended", "agency-1", expect.any(Object), expect.anything());
    expect(cancelMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it("does nothing when an agent-leg event arrives for an already-terminal call (second leg)", async () => {
    findByIdMock.mockResolvedValue(makeCall({ state: "ended", ended_at: "2026-01-01T00:00:10Z" }));

    const result = await processProviderEvent(agentLegEvent("ended", "call-1", "agent-leg-1"));

    expect(updateStateMock).not.toHaveBeenCalled();
    expect(cancelMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it("never creates a call for an outbound leg call.initiated echo", async () => {
    findByIdMock.mockResolvedValue(null);

    const result = await processProviderEvent(agentLegEvent("inbound", "call-1", "agent-leg-1"));

    expect(createMock).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("still creates calls for genuine inbound events (regression)", async () => {
    findByProviderCallIdMock.mockResolvedValue(null);
    findByE164Mock.mockResolvedValue({
      id: "n1", agency_id: "agency-1", campaign_id: "campaign-1",
      provider: "telnyx", e164: "+15559876543", status: "active",
    });
    createMock.mockResolvedValue(makeCall({ provider_call_id: "caller-leg-9" }));
    // The inline routeCall re-loads the call — it must still be in 'routing'.
    findByIdMock.mockResolvedValue(makeCall({ provider_call_id: "caller-leg-9", state: "routing" }));

    await processProviderEvent({
      provider: "mock", eventId: "evt-inbound", type: "inbound",
      providerCallId: "caller-leg-9", occurredAt: "2026-01-01T00:00:00Z",
      from: "+15551234567", to: "+15559876543", raw: {},
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    // No eligible agents → the ringing→missed claim records the outcome.
    expect(claimStateMock).toHaveBeenCalledWith("call-1", "ringing", "missed", "agency-1", expect.anything(), expect.anything());
    expect(cancelMock).toHaveBeenCalledWith({ providerAttemptId: "caller-leg-9" });
  });

  it("plays a holding message into the answered caller leg (no dead silence)", async () => {
    findByProviderCallIdMock.mockResolvedValue(null);
    findByE164Mock.mockResolvedValue({
      id: "n1", agency_id: "agency-1", campaign_id: "campaign-1",
      provider: "telnyx", e164: "+15559876543", status: "active",
    });
    createMock.mockResolvedValue(makeCall({ provider_call_id: "caller-leg-9" }));
    findByIdMock.mockResolvedValue(makeCall({ provider_call_id: "caller-leg-9", state: "routing" }));

    await processProviderEvent({
      provider: "mock", eventId: "evt-inbound-hold", type: "inbound",
      providerCallId: "caller-leg-9", occurredAt: "2026-01-01T00:00:00Z",
      from: "+15551234567", to: "+15559876543", raw: {},
    });
    // Fire-and-forget chain — flush microtasks so the speak call lands.
    await new Promise((r) => setTimeout(r, 0));

    expect(speakMock).toHaveBeenCalledWith(
      expect.objectContaining({ callId: "caller-leg-9", text: expect.stringContaining("hold") }),
    );
  });

  it("fails closed on unknown DID — no call row, no fallback routing (Phase 0.2)", async () => {
    findByProviderCallIdMock.mockResolvedValue(null);
    findByE164Mock.mockResolvedValue(null);

    await expect(processProviderEvent({
      provider: "mock", eventId: "evt-unknown-did", type: "inbound",
      providerCallId: "caller-leg-unknown", occurredAt: "2026-01-01T00:00:00Z",
      from: "+15551234567", to: "+19999999999", raw: {},
    })).rejects.toThrow("Unknown or unassigned DID");

    // No call row was created for the unknown DID — the webhook layer turns
    // the throw into a 400 so nothing is ever billed to a random agency.
    expect(createMock).not.toHaveBeenCalled();
    // The already-answered caller leg is hung up first — no dangling silence.
    expect(cancelMock).toHaveBeenCalledWith({ providerAttemptId: "caller-leg-unknown" });
  });
});

describe("routeCall — idempotency under duplicate/redelivered jobs", () => {
  it("does not dial when the call is not in routing state (duplicate job)", async () => {
    findByIdMock.mockResolvedValue(makeCall({ state: "ringing" }));

    const result = await routeCall("call-1");

    expect(claimStateMock).not.toHaveBeenCalled();
    expect(cancelMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ selected: null, claimed: false });
  });

  it("does not dial when the routing→ringing claim is lost to a concurrent actor", async () => {
    findByIdMock.mockResolvedValue(makeCall({ state: "routing" }));
    claimStateMock.mockResolvedValueOnce(null);

    const result = await routeCall("call-1");

    expect(claimStateMock).toHaveBeenCalledTimes(1);
    expect(cancelMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ selected: null, claimed: false });
  });

  it("claims routing→ringing before dialing (ring_started_at set on the claim)", async () => {
    findByIdMock.mockResolvedValue(makeCall({ state: "routing" }));
    // No candidates → no dial, but the guard claim must have happened.
    await routeCall("call-1");

    expect(claimStateMock).toHaveBeenCalledWith(
      "call-1", "routing", "ringing", "agency-1",
      expect.objectContaining({ ring_started_at: expect.any(String) }),
      undefined,
    );
  });
});

describe("routeCall — live-for-campaign gate (P1.2)", () => {
  function liveAgent(id: string) {
    return {
      id,
      agency_id: "agency-1",
      membership_id: `mem-${id}`,
      approval_status: "approved",
      availability: "available",
      priority: 1,
      states: [],
      zip_prefixes: [],
      licenses: [],
      skills: [],
      endpoint_types: ["webrtc"],
      last_assigned_at: null,
      forwarding_number: null,
      npn: null,
      display_code: null,
      is_busy: false,
    };
  }

  function liveCampaign() {
    return {
      id: "campaign-1",
      price_cents: 0, // wallet gate passes without funding rows
      routing_strategy: "priority",
      allowed_endpoints: ["webrtc", "pstn"],
      target_states: [],
      required_license: null,
      required_skills: [],
    };
  }

  it("only rings agents live for the campaign, never cross-campaign fill", async () => {
    findByIdMock.mockResolvedValue(makeCall({ state: "routing" }));
    campaignFindByIdMock.mockResolvedValue(liveCampaign());
    findAvailableMock.mockResolvedValue([liveAgent("agent-cold"), liveAgent("agent-live")]);
    findLiveAgentIdsMock.mockResolvedValue(["agent-live"]);

    const result = await routeCall("call-1");

    expect(findLiveAgentIdsMock).toHaveBeenCalledWith("campaign-1", undefined);
    // agent-cold is available but not live -> must never be selected
    expect(result.selected).toBe("agent-live");
  });

  it("misses the call when nobody is live for the campaign", async () => {
    findByIdMock.mockResolvedValue(makeCall({ state: "routing" }));
    campaignFindByIdMock.mockResolvedValue(liveCampaign());
    findAvailableMock.mockResolvedValue([liveAgent("agent-1")]);
    // someone selected this campaign before, but nobody is live now
    findLiveAgentIdsMock.mockResolvedValue([]);

    const result = await routeCall("call-1");

    expect(result.selected).toBeNull();
    expect(cancelMock).toHaveBeenCalledWith({ providerAttemptId: "caller-leg-1" });
  });

  it("treats never-selected campaigns as open (legacy fallback)", async () => {
    findByIdMock.mockResolvedValue(makeCall({ state: "routing" }));
    campaignFindByIdMock.mockResolvedValue(liveCampaign());
    findAvailableMock.mockResolvedValue([liveAgent("agent-1")]);
    findLiveAgentIdsMock.mockResolvedValue(null);

    const result = await routeCall("call-1");

    expect(result.selected).toBe("agent-1");
  });

  it("never routes exclusive campaigns openly (assignment required)", async () => {
    findByIdMock.mockResolvedValue(makeCall({ state: "routing" }));
    campaignFindByIdMock.mockResolvedValue({ ...liveCampaign(), is_exclusive: true, visibility: "exclusive" });
    findAvailableMock.mockResolvedValue([liveAgent("agent-1")]);
    findLiveAgentIdsMock.mockResolvedValue(null);

    const result = await routeCall("call-1");

    expect(result.selected).toBeNull();
    expect(cancelMock).toHaveBeenCalledWith({ providerAttemptId: "caller-leg-1" });
  });

  it("funds routing eligibility from the effective balance (P1.4)", async () => {    findByIdMock.mockResolvedValue(makeCall({ state: "routing" }));
    campaignFindByIdMock.mockResolvedValue(liveCampaign());
    findAvailableMock.mockResolvedValue([liveAgent("agent-1")]);
    findLiveAgentIdsMock.mockResolvedValue(null);

    await routeCall("call-1");

    const { query: dbQuery } = await import("@/server/db");
    const walletQueries = (dbQuery as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call: unknown[]) => typeof call[0] === "string" && (call[0] as string).includes("wallet_cents"),
    );
    expect(walletQueries.length).toBeGreaterThan(0);
    for (const call of walletQueries as Array<[string]>) {
      expect(call[0]).toContain("agency_wallet_allocations");
    }
  });
});

describe("handleNoAnswer — failover claims", () => {
  it("returns null when the ringing→routing claim is lost (overlapping failovers)", async () => {
    findByIdMock.mockResolvedValue(makeCall({ state: "ringing", agent_id: "agent-1" }));
    claimStateMock.mockResolvedValueOnce(null);

    const result = await handleNoAnswer("call-1", "timeout");

    expect(result).toBeNull();
    expect(cancelMock).not.toHaveBeenCalled();
    expect(claimStateMock).toHaveBeenCalledWith("call-1", "ringing", "routing", "agency-1", expect.anything(), undefined);
  });

  it("marks the call missed via the ringing→missed claim once attempts are exhausted", async () => {
    findByIdMock.mockResolvedValue(makeCall({
      state: "ringing",
      agent_id: "agent-1",
      routing_snapshot: { triedAgentIds: ["a"] },
    }));

    const result = await handleNoAnswer("call-1", "timeout");

    expect(result).toEqual({ rerouted: false, attempts: 2, reason: "timeout" });
    expect(cancelMock).toHaveBeenCalledWith({ providerAttemptId: "caller-leg-1" });
    expect(claimStateMock).toHaveBeenCalledWith(
      "call-1", "ringing", "missed", "agency-1",
      expect.objectContaining({ ended_at: expect.any(String), routing_snapshot: expect.objectContaining({ triedAgentIds: ["a", "agent-1"] }) }),
      undefined,
    );
  });
});