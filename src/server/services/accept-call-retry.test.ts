import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const bridgeMock = vi.hoisted(() => vi.fn());
const stopAudioMock = vi.hoisted(() => vi.fn(async () => undefined));
const startRecordingMock = vi.hoisted(() => vi.fn(async () => undefined));
const campaignFindMock = vi.hoisted(() => vi.fn(async () => ({ record_calls: true })));
const updateStateMock = vi.hoisted(() => vi.fn(async (_id: string, state: string) => ({ ...RINGING_CALL, id: "call-1", state })));
const findCallMock = vi.hoisted(() => vi.fn());
const findAgentMock = vi.hoisted(() => vi.fn(async (): Promise<{ id: string; membership_id: string; endpoint_types?: string[] }> => ({ id: "agent-1", membership_id: "m-1" })));
const publishMock = vi.hoisted(() => vi.fn());
const claimStateMock = vi.hoisted(() => vi.fn(async (id: string, _from: string, to: string) => ({ ...RINGING_CALL, id, state: to })));

vi.mock("@/server/telephony-registry", () => ({
  getTelephonyProvider: vi.fn(() => ({ bridge: bridgeMock, stopAudio: stopAudioMock, startRecording: startRecordingMock })),
}));

vi.mock("@/server/repositories", () => ({
  calls: { findById: findCallMock, updateState: updateStateMock, claimState: claimStateMock },
  agents: { findById: findAgentMock },
  campaigns: { findById: campaignFindMock },
}));

vi.mock("@/lib/event-bridge", () => ({
  publishCallEvent: publishMock,
}));

const dbQueryMock = vi.hoisted(() => vi.fn(async () => [] as unknown[]));

vi.mock("@/server/db", () => ({
  query: dbQueryMock,
  queryOne: vi.fn(async () => null),
  transaction: vi.fn(async (fn: (client: never) => Promise<unknown>) => fn({} as never)),
}));

import { acceptCall } from "./call-orchestrator";

const RINGING_CALL = {
  id: "call-1",
  state: "ringing",
  agency_id: "agency-1",
  agent_id: "agent-1",
  provider: "telnyx",
  provider_call_id: "caller-leg",
  provider_agent_call_id: "agent-leg",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  findCallMock.mockResolvedValue({ ...RINGING_CALL });
});

afterEach(() => {
  vi.useRealTimers();
});

async function runAccept() {
  const p = acceptCall("call-1");
  await vi.advanceTimersByTimeAsync(20000);
  return p;
}

describe("acceptCall bridge wait loop", () => {
  it("bridges immediately when the agent leg is already answered", async () => {
    bridgeMock.mockResolvedValue(undefined);
    const result = await runAccept();
    expect(bridgeMock).toHaveBeenCalledTimes(1);
    expect(claimStateMock).toHaveBeenCalledWith("call-1", "connecting", "connected", "agency-1", expect.anything());
    expect(result).toMatchObject({ state: "connected" });
  });

  it("rides through late pickup (90034) and bridges when answered", async () => {
    bridgeMock
      .mockRejectedValueOnce(new Error("90034 Call not answered yet"))
      .mockRejectedValueOnce(new Error("90034 Call not answered yet"))
      .mockResolvedValue(undefined);
    const result = await runAccept();
    expect(bridgeMock).toHaveBeenCalledTimes(3);
    expect(claimStateMock).toHaveBeenCalledWith("call-1", "connecting", "connected", "agency-1", expect.anything());
    expect(result).toMatchObject({ state: "connected" });
  });

  it("wakes on the agent_answered_at stamp and bridges on the next attempt", async () => {
    bridgeMock
      .mockRejectedValueOnce(new Error("90034 Call not answered yet"))
      .mockResolvedValue(undefined);
    // First read (loop start): ringing, no stamp. Poll reads: stamp present.
    findCallMock
      .mockResolvedValueOnce({ ...RINGING_CALL })
      .mockResolvedValue({ ...RINGING_CALL, routing_snapshot: { agent_answered_at: "2026-01-01T00:00:05Z" } });
    const result = await runAccept();
    expect(bridgeMock).toHaveBeenCalledTimes(2);
    expect(claimStateMock).toHaveBeenCalledWith("call-1", "connecting", "connected", "agency-1", expect.anything());
    expect(result).toMatchObject({ state: "connected" });
  });

  it("cuts the holding-audio tail on bridge success (never talks over the greeting)", async () => {
    bridgeMock.mockResolvedValue(undefined);
    const result = await runAccept();
    expect(result).toMatchObject({ state: "connected" });
    expect(stopAudioMock).toHaveBeenCalledWith({ callId: "caller-leg" });
  });

  it("starts dual-channel recording on connect when the campaign wants it", async () => {
    bridgeMock.mockResolvedValue(undefined);
    const result = await runAccept();
    expect(result).toMatchObject({ state: "connected" });
    expect(startRecordingMock).toHaveBeenCalledWith({ callId: "caller-leg" });
  });

  it("skips recording when the campaign disables it", async () => {
    bridgeMock.mockResolvedValue(undefined);
    campaignFindMock.mockResolvedValueOnce({ record_calls: false });
    const result = await runAccept();
    expect(result).toMatchObject({ state: "connected" });
    expect(startRecordingMock).not.toHaveBeenCalled();
  });

  it("converges concurrent accepts: claim loser returns without bridging", async () => {
    bridgeMock.mockResolvedValue(undefined);
    (claimStateMock as unknown as { mockImplementationOnce: (fn: () => Promise<null>) => void }).mockImplementationOnce(async () => null);
    findCallMock
      .mockResolvedValueOnce({ ...RINGING_CALL })
      .mockResolvedValue({ ...RINGING_CALL, state: "connected" });
    const result = await runAccept();
    expect(bridgeMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ state: "connected" });
  });

  it("gives up after bounded retries and marks missed (never hangs forever)", async () => {
    bridgeMock.mockRejectedValue(new Error("90034 Call not answered yet"));
    const result = await runAccept();
    expect(bridgeMock).toHaveBeenCalledTimes(8);
    expect(updateStateMock).toHaveBeenCalledWith("call-1", "missed", "agency-1", expect.anything());
    expect(result).toBeNull();
  });

  it("goes straight to missed on fatal bridge errors (leg gone)", async () => {
    bridgeMock.mockRejectedValue(new Error("404 leg not found"));
    const result = await runAccept();
    expect(bridgeMock).toHaveBeenCalledTimes(1);
    expect(updateStateMock).toHaveBeenCalledWith("call-1", "missed", "agency-1", expect.anything());
    expect(result).toBeNull();
  });

  it("stops retrying when the call ends underneath (caller hung up)", async () => {
    bridgeMock.mockRejectedValue(new Error("90034 Call not answered yet"));
    findCallMock
      .mockResolvedValueOnce({ ...RINGING_CALL })
      .mockResolvedValue({ ...RINGING_CALL, state: "ended" });
    const result = await runAccept();
    expect(bridgeMock).toHaveBeenCalledTimes(1);
    expect(updateStateMock).toHaveBeenCalledWith("call-1", "missed", "agency-1", expect.anything());
    expect(result).toBeNull();
  });

  it("fails fast when a webrtc-only browser never got the INVITE (no 422 loop)", async () => {
    findAgentMock.mockResolvedValueOnce({ id: "agent-1", membership_id: "m-1", endpoint_types: ["webrtc"] });
    const p = acceptCall("call-1", { browserAnswered: false });
    await vi.advanceTimersByTimeAsync(20000);
    const result = await p;
    expect(bridgeMock).not.toHaveBeenCalled();
    expect(dbQueryMock).toHaveBeenCalledWith(expect.stringContaining("browser_no_invite"), ["call-1"]);
    expect(updateStateMock).toHaveBeenCalledWith("call-1", "missed", "agency-1", expect.anything());
    expect(publishMock).toHaveBeenCalledWith("m-1", "call:ended", expect.objectContaining({ reason: "browser_no_invite" }));
    expect(result).toBeNull();
  });

  it("still runs the wait loop for PSTN agents whose phone may answer without a browser", async () => {
    findAgentMock.mockResolvedValueOnce({ id: "agent-1", membership_id: "m-1", endpoint_types: ["webrtc", "pstn"] });
    bridgeMock.mockRejectedValue(new Error("90034 Call not answered yet"));
    const p = acceptCall("call-1", { browserAnswered: false });
    await vi.advanceTimersByTimeAsync(20000);
    await p;
    expect(bridgeMock).toHaveBeenCalledTimes(8);
  });
});

