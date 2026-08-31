import { describe, expect, it, beforeAll } from "vitest";

const SKIP_REASON = "Set TELNYX_API_KEY env to run live Telnyx tests";

beforeAll(() => {
  if (!process.env.TELNYX_API_KEY) return;
  process.env.TELNYX_CONNECTION_ID = process.env.TELNYX_CONNECTION_ID ?? "";
  process.env.TELNYX_PUBLIC_KEY = process.env.TELNYX_PUBLIC_KEY ?? "";
});

describe.runIf(process.env.TELNYX_API_KEY)("telnyxProvider live integration", () => {
  it("can list the call control application", async () => {
    const { telnyxProvider } = await import("./telnyx");
    const connectionId = process.env.TELNYX_CONNECTION_ID!;
    expect(connectionId).toBeTruthy();
    expect(telnyxProvider.name).toBe("telnyx");
  });

  it("normalizes a real call.initiated webhook payload", async () => {
    const { telnyxProvider } = await import("./telnyx");
    const payload = {
      data: {
        record_type: "event",
        event_type: "call.initiated",
        id: "0ccc7b54-4df3-4bca-a65a-3da1ecc777f0",
        occurred_at: "2026-07-14T12:00:00.000Z",
        payload: {
          call_control_id: "v2:F5_VijVqrosogeY_2L_JhCEHd2Dh-x4xz7tROTbh34tg6Zsk4JJc-w",
          connection_id: "3003854012840674670",
          call_leg_id: "d14dbcee-880b-11eb-8204-02420a0f7568",
          call_session_id: "428c31b6-abf3-3bc1-b7f4-5013ef9657c1",
          client_state: null,
          from: "+15551234567",
          to: "+15559876543",
          direction: "incoming",
          state: "parked",
        },
      },
      meta: { attempt: 1, delivered_to: "https://example.com/webhooks" },
    };
    const event = telnyxProvider.normalizeEvent(payload);
    expect(event.provider).toBe("telnyx");
    expect(event.type).toBe("inbound");
    expect(event.providerCallId).toBe("v2:F5_VijVqrosogeY_2L_JhCEHd2Dh-x4xz7tROTbh34tg6Zsk4JJc-w");
    expect(event.from).toBe("+15551234567");
    expect(event.to).toBe("+15559876543");
    expect(event.eventId).toBe("0ccc7b54-4df3-4bca-a65a-3da1ecc777f0");
  });

  it("normalizes a call.answered webhook", async () => {
    const { telnyxProvider } = await import("./telnyx");
    const payload = {
      data: {
        event_type: "call.answered",
        id: "evt_answered_001",
        occurred_at: "2026-07-14T12:00:30.000Z",
        payload: {
          call_control_id: "v2:abc123",
          from: "+15551234567",
          to: "+15559876543",
          start_time: "2026-07-14T12:00:30.000Z",
        },
      },
    };
    const event = telnyxProvider.normalizeEvent(payload);
    expect(event.type).toBe("connected");
    expect(event.providerCallId).toBe("v2:abc123");
  });

  it("normalizes a call.hangup webhook", async () => {
    const { telnyxProvider } = await import("./telnyx");
    const payload = {
      data: {
        event_type: "call.hangup",
        id: "evt_hangup_001",
        occurred_at: "2026-07-14T12:01:00.000Z",
        payload: {
          call_control_id: "v2:abc123",
          from: "+15551234567",
          to: "+15559876543",
          duration: 45,
        },
      },
    };
    const event = telnyxProvider.normalizeEvent(payload);
    expect(event.type).toBe("ended");
  });

  it("ring throws without destination", async () => {
    const { telnyxProvider } = await import("./telnyx");
    await expect(telnyxProvider.ring({ callId: "c1", agentId: "a1", endpoint: "pstn" })).rejects.toThrow("destination");
  });
});

describe.skipIf(process.env.TELNYX_API_KEY)("telnyxProvider (skipped)", () => {
  it("requires TELNYX_API_KEY env var", () => {
    console.log(`  ${SKIP_REASON}`);
  });
});
