import { describe, expect, it } from "vitest";
import { mockProvider, decodeClientState } from "./telephony";
import type { NormalizedProviderEvent, ProviderEventType } from "./telephony";

describe("decodeClientState", () => {
  it("decodes a valid base64 client_state into call/agent context", () => {
    const b64 = Buffer.from(JSON.stringify({ callId: "call-1", agentId: "agent-9" })).toString("base64");
    expect(decodeClientState(b64)).toEqual({ callId: "call-1", agentId: "agent-9" });
  });

  it("tolerates missing fields", () => {
    const b64 = Buffer.from(JSON.stringify({ callId: "call-1" })).toString("base64");
    expect(decodeClientState(b64)).toEqual({ callId: "call-1", agentId: undefined });
  });

  it("returns an empty context for malformed base64", () => {
    expect(decodeClientState("not-valid-base64!!!")).toEqual({ callId: undefined, agentId: undefined });
  });

  it("returns an empty context for valid base64 that is not JSON", () => {
    expect(decodeClientState(Buffer.from("hello").toString("base64"))).toEqual({ callId: undefined, agentId: undefined });
  });

  it("ignores non-string callId/agentId values", () => {
    const b64 = Buffer.from(JSON.stringify({ callId: 42, agentId: { x: 1 } })).toString("base64");
    expect(decodeClientState(b64)).toEqual({ callId: undefined, agentId: undefined });
  });
});

describe("mockProvider", () => {
  it("has correct name and capabilities", () => {
    expect(mockProvider.name).toBe("mock");
    expect(mockProvider.capabilities).toEqual({ webRtc: true, pstn: true, recordings: true });
  });

  it("verifyWebhook always returns true", async () => {
    await expect(mockProvider.verifyWebhook({ payload: "", signature: null, timestamp: null })).resolves.toBe(true);
  });

  describe("normalizeEvent", () => {
    it("transforms a valid payload into NormalizedProviderEvent", () => {
      const payload = { eventId: "evt_1", type: "inbound" as ProviderEventType, callId: "call_1", from: "+1234", to: "+5678" };
      const result = mockProvider.normalizeEvent(payload);
      expect(result.provider).toBe("mock");
      expect(result.eventId).toBe("evt_1");
      expect(result.type).toBe("inbound");
      expect(result.providerCallId).toBe("call_1");
      expect(result.from).toBe("+1234");
      expect(result.to).toBe("+5678");
      expect(result.raw).toEqual(payload);
    });

    it("uses current ISO timestamp when occurredAt is missing", () => {
      const before = new Date().toISOString();
      const result = mockProvider.normalizeEvent({ eventId: "evt_2", type: "ended", callId: "call_2" });
      const after = new Date().toISOString();
      expect(result.occurredAt >= before && result.occurredAt <= after).toBe(true);
    });

    it("coerces all values to string via String()", () => {
      const result = mockProvider.normalizeEvent({ eventId: 42, type: "connected", callId: 99 });
      expect(result.eventId).toBe("42");
      expect(result.providerCallId).toBe("99");
    });
  });

  it("ring returns compound providerAttemptId", async () => {
    const result = await mockProvider.ring({ callId: "c1", agentId: "a1", endpoint: "webrtc" });
    expect(result.providerAttemptId).toBe("mock_c1_a1");
  });

  it("bridge resolves without error", async () => {
    await expect(mockProvider.bridge({ callId: "c1", providerAttemptId: "mock_c1_a1" })).resolves.toBeUndefined();
  });

  it("cancel resolves without error", async () => {
    await expect(mockProvider.cancel({ providerAttemptId: "mock_c1_a1" })).resolves.toBeUndefined();
  });

  it("fetchRecording returns a mock recording URL", async () => {
    const result = await mockProvider.fetchRecording({ providerCallId: "call_1" });
    expect(result.url).toBe("mock://recordings/call_1");
    expect(result.contentType).toBe("audio/wav");
  });
});
