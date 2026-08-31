import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mockProvider, type NormalizedProviderEvent } from "@/domain/telephony";

const processMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const normalizeMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/services/call-orchestrator", () => ({
  processProviderEvent: processMock,
}));

vi.mock("@/server/telephony-registry", () => ({
  getTelephonyProvider: vi.fn(() => ({ ...mockProvider, normalizeEvent: normalizeMock })),
}));

const { POST } = await import("@/app/api/telephony/[provider]/webhook/route");

function telnyxPayload(clientState?: string) {
  const payload: Record<string, unknown> = {
    data: {
      event_type: "call.initiated",
      id: "evt-1",
      occurred_at: "2026-01-01T00:00:00Z",
      payload: { call_control_id: "cc1", from: "+15551234567", to: "+15559876543" },
    } as Record<string, unknown>,
  };
  if (clientState !== undefined) {
    (payload.data as Record<string, unknown>).payload = {
      ...((payload.data as Record<string, unknown>).payload as Record<string, unknown>),
      client_state: clientState,
    };
  }
  return payload;
}

function post(payload: unknown) {
  return POST(
    new Request("http://x/api/telephony/mock/webhook", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    { params: Promise.resolve({ provider: "mock" }) },
  );
}

beforeAll(() => {
  process.env.WEBHOOK_LOG_FILE = join(tmpdir(), `webhook-test-${Date.now()}.log`);
});

beforeEach(() => {
  vi.clearAllMocks();
  normalizeMock.mockReturnValue({
    provider: "mock",
    eventId: "evt-1",
    type: "inbound",
    providerCallId: "cc1",
    occurredAt: "2026-01-01T00:00:00Z",
    raw: {},
  });
});

describe("telephony webhook route — client_state handling", () => {
  it("forwards agent-leg events with decoded call context", async () => {
    const clientState = Buffer.from(JSON.stringify({ callId: "call-1", agentId: "agent-1" })).toString("base64");

    const res = await post(telnyxPayload(clientState));

    expect(res.status).toBe(202);
    expect(processMock).toHaveBeenCalledTimes(1);
    const [event] = processMock.mock.calls[0] as [NormalizedProviderEvent];
    expect(event.callId).toBe("call-1");
    expect(event.agentId).toBe("agent-1");
  });

  it("skips outbound legs whose client_state has no call context (foreign legs)", async () => {
    const clientState = Buffer.from("not-json").toString("base64");

    const res = await post(telnyxPayload(clientState));

    expect(res.status).toBe(200);
    expect(processMock).not.toHaveBeenCalled();
  });

  it("processes caller-leg events without any call context", async () => {
    const res = await post(telnyxPayload());

    expect(res.status).toBe(202);
    expect(processMock).toHaveBeenCalledTimes(1);
    const [event] = processMock.mock.calls[0] as [NormalizedProviderEvent];
    expect(event.callId).toBeUndefined();
    expect(event.agentId).toBeUndefined();
  });
});