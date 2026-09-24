import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const bridgeMock = vi.hoisted(() => vi.fn());
const updateStateMock = vi.hoisted(() => vi.fn(async (_id: string, state: string) => ({ id: "call-1", state })));
const findCallMock = vi.hoisted(() => vi.fn());
const findAgentMock = vi.hoisted(() => vi.fn(async () => ({ id: "agent-1", membership_id: "m-1" })));
const publishMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/telephony-registry", () => ({
  getTelephonyProvider: vi.fn(() => ({ bridge: bridgeMock })),
}));

vi.mock("@/server/repositories", () => ({
  calls: { findById: findCallMock, updateState: updateStateMock },
  agents: { findById: findAgentMock },
}));

vi.mock("@/lib/event-bridge", () => ({
  publishCallEvent: publishMock,
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
    expect(updateStateMock).toHaveBeenCalledWith("call-1", "connected", "agency-1", expect.anything());
    expect(result).toMatchObject({ state: "connected" });
  });

  it("rides through late pickup (90034) and bridges when answered", async () => {
    bridgeMock
      .mockRejectedValueOnce(new Error("90034 Call not answered yet"))
      .mockRejectedValueOnce(new Error("90034 Call not answered yet"))
      .mockResolvedValue(undefined);
    const result = await runAccept();
    expect(bridgeMock).toHaveBeenCalledTimes(3);
    expect(updateStateMock).toHaveBeenCalledWith("call-1", "connected", "agency-1", expect.anything());
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
    expect(updateStateMock).toHaveBeenCalledWith("call-1", "connected", "agency-1", expect.anything());
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
});
