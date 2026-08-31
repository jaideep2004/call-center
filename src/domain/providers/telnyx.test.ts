import { describe, expect, it, beforeAll, vi } from "vitest";
import { telnyxProvider } from "./telnyx";
import type { ProviderEventType } from "@/domain/telephony";

vi.mock("telnyx", () => {
  const client = {
    calls: {
      dial: vi.fn(async () => ({ data: { call_control_id: "ccimock" } })),
      actions: {
        answer: vi.fn(async () => ({})),
        bridge: vi.fn(async () => ({})),
        hangup: vi.fn(async () => ({})),
      },
    },
    recordings: {
      list: vi.fn(async () => ({ data: [] })),
      retrieve: vi.fn(async () => ({ data: null })),
    },
  };
  return { default: vi.fn(() => client) };
});

beforeAll(() => {
  process.env.TELNYX_PUBLIC_KEY = "MCowBQYDK2VwAyEAnKJDBpGRLxVjERI3PFhPeBUDJT5vcAUdP5NKZHXZFKE=";
  process.env.TELNYX_API_KEY = "KEYtest123";
  process.env.TELNYX_CONNECTION_ID = "test-conn-id";
});

describe("telnyxProvider", () => {
  it("has correct name and capabilities", () => {
    expect(telnyxProvider.name).toBe("telnyx");
    expect(telnyxProvider.capabilities).toEqual({ webRtc: true, pstn: true, recordings: true });
  });

  describe("verifyWebhook", () => {
    it("returns false when signature is missing", async () => {
      await expect(telnyxProvider.verifyWebhook({ payload: "{}", signature: null, timestamp: null })).resolves.toBe(false);
    });

    it("returns false when signature is garbage", async () => {
      await expect(telnyxProvider.verifyWebhook({ payload: '{"test":1}', signature: "AAAAAA", timestamp: "1234567890" })).resolves.toBe(false);
    });
  });

  describe("normalizeEvent", () => {
    it("maps call.initiated to inbound from data.event_type", () => {
      const event = {
        data: {
          event_type: "call.initiated",
          id: "evt_001",
          occurred_at: "2026-01-01T00:00:00Z",
          payload: { call_control_id: "cciaaaabbb", from: "+15551234567", to: "+15559876543" },
        },
      };
      const result = telnyxProvider.normalizeEvent(event);
      expect(result.provider).toBe("telnyx");
      expect(result.type).toBe("inbound");
      expect(result.providerCallId).toBe("cciaaaabbb");
      expect(result.from).toBe("+15551234567");
      expect(result.to).toBe("+15559876543");
      expect(result.eventId).toBe("evt_001");
    });

    it("maps call.answered to connected", () => {
      const result = telnyxProvider.normalizeEvent({
        data: { event_type: "call.answered", id: "evt_002", payload: { call_control_id: "ccicccddd" } },
      });
      expect(result.type).toBe("connected");
    });

    it("maps call.hangup to ended", () => {
      const result = telnyxProvider.normalizeEvent({
        data: { event_type: "call.hangup", id: "evt_003", payload: { call_control_id: "ccieeefff" } },
      });
      expect(result.type).toBe("ended");
    });

    it("maps recording.saved to recording_ready", () => {
      const result = telnyxProvider.normalizeEvent({
        data: { event_type: "recording.saved", id: "evt_004", payload: { call_control_id: "ccieeefff" } },
      });
      expect(result.type).toBe("recording_ready");
    });

    it("maps v2 call.recording.saved to recording_ready", () => {
      const result = telnyxProvider.normalizeEvent({
        data: { event_type: "call.recording.saved", id: "evt_008", payload: { call_control_id: "ccieeefff" } },
      });
      expect(result.type).toBe("recording_ready");
    });

    it("maps call.bridged to a no-op so bridging does not end the call", () => {
      const result = telnyxProvider.normalizeEvent({
        data: { event_type: "call.bridged", id: "evt_006", payload: { call_control_id: "ccieeefff" } },
      });
      expect(result.type).toBe("ringing");
    });

    it("maps call.cost to a no-op so billing events do not end the call", () => {
      const result = telnyxProvider.normalizeEvent({
        data: { event_type: "call.cost", id: "evt_007", payload: { call_control_id: "ccieeefff" } },
      });
      expect(result.type).toBe("ringing");
    });

    it("falls back to ended for unknown event types", () => {
      const result = telnyxProvider.normalizeEvent({
        data: { event_type: "call.unknown", id: "evt_005", payload: { call_control_id: "ccieeefff" } },
      });
      expect(result.type).toBe("ended");
    });

    it("handles legacy format with metadata.event", () => {
      const event = {
        metadata: {
          event: {
            event_type: "call.initiated",
            id: "evt_legacy",
            occurred_at: "2026-01-01T00:00:00Z",
            payload: { call_control_id: "ccilegacy" },
          },
        },
      };
      const result = telnyxProvider.normalizeEvent(event);
      expect(result.type).toBe("inbound");
      expect(result.providerCallId).toBe("ccilegacy");
      expect(result.eventId).toBe("evt_legacy");
    });

    it("handles top-level event_type for old webhook format", () => {
      const event = {
        event_type: "call.hangup",
        id: "evt_006",
        occurred_at: "2026-01-01T00:00:00Z",
        payload: { call_control_id: "ccitop" },
        call_leg_id: "ccitop",
      };
      const result = telnyxProvider.normalizeEvent(event);
      expect(result.type).toBe("ended");
      expect(result.providerCallId).toBe("ccitop");
    });
  });

  describe("ring", () => {
    it("throws when no destination address is provided", async () => {
      await expect(telnyxProvider.ring({ callId: "c1", agentId: "a1", endpoint: "pstn" })).rejects.toThrow("requires a destination address");
    });
  });

  describe("fetchRecording", () => {
    it("throws when providerCallId is empty", async () => {
      await expect(telnyxProvider.fetchRecording({ providerCallId: "nonexistent" })).rejects.toThrow();
    });

    it("throws fast when neither recordingId nor providerCallId is provided", async () => {
      await expect(telnyxProvider.fetchRecording({})).rejects.toThrow("No recording found");
    });
  });
});
