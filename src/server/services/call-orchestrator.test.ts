import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockProvider } from "@/domain/telephony";

const {
  updateStateMock, findByIdMock, findByProviderCallIdMock, createMock, cancelMock, enqueueRecordingMock, claimStateMock,
} = vi.hoisted(() => ({
  updateStateMock: vi.fn(),
  findByIdMock: vi.fn(),
  findByProviderCallIdMock: vi.fn(),
  createMock: vi.fn(),
  cancelMock: vi.fn(),
  enqueueRecordingMock: vi.fn(),
  claimStateMock: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  query: vi.fn().mockResolvedValue([]),
  queryOne: vi.fn().mockResolvedValue(null),
  transaction: vi.fn(async (fn: (client: any) => Promise<unknown>) =>
    fn({ query: vi.fn(async () => ({ rows: [{ balance: 100000 }] })) })),
}));

vi.mock("@/server/telephony-registry", () => ({
  getTelephonyProvider: vi.fn(() => ({ ...mockProvider, cancel: cancelMock })),
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
    claimState: claimStateMock,
  },
  agents: {
    findById: vi.fn().mockResolvedValue(null),
    findAvailable: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
  },
  campaigns: { findById: vi.fn().mockResolvedValue(null) },
  bidOverrides: { findLatest: vi.fn().mockResolvedValue(null) },
  phoneNumbers: { findByE164: vi.fn().mockResolvedValue(null), findByCampaign: vi.fn().mockResolvedValue(null) },
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

  it("ignores agent-leg answered events while ringing (no state change)", async () => {
    findByIdMock.mockResolvedValue(makeCall({ agent_id: "agent-1" }));

    const result = await processProviderEvent(agentLegEvent("connected", "call-1", "agent-leg-1"));

    expect(updateStateMock).not.toHaveBeenCalled();
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