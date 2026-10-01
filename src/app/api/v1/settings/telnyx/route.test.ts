import { describe, it, expect, vi, beforeEach } from "vitest";

const presenceMock = vi.hoisted(() => vi.fn(() => ({
  api_key: true,
  connection_id: true,
  public_key: true,
  webrtc_sip_user: false,
})));
const checkMock = vi.hoisted(() => vi.fn(async (): Promise<{
  configured: boolean;
  ok: boolean;
  latency_ms: number | null;
  message: string;
  details: Record<string, boolean>;
}> => ({
  configured: true,
  ok: true,
  latency_ms: 123,
  message: "Connected",
  details: { api_key: true, connection_id: true, public_key: true, webrtc_sip_user: false },
})));

vi.mock("@/server/services/telnyx", () => ({
  telnyxPresence: presenceMock,
  checkTelnyxConnection: checkMock,
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, {
            ...(ctx as object),
            user: { id: "u-a", role: "admin" },
            agencyId: null,
            membership: null,
            isHead: false,
          });
        } catch (e: unknown) {
          const err = e as { message?: string; status?: number };
          return actual.fail(err.message ?? "Internal server error", err.status ?? 500);
        }
      };
    },
  };
});

const { GET, POST } = await import("./route");

function req(method: string) {
  return new Request("http://x/api/v1/settings/telnyx", { method });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /settings/telnyx", () => {
  it("reports key presence without ever returning secrets", async () => {
    const res = await GET(req("GET"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ configured: true, api_key: true });
    expect(JSON.stringify(body.data)).not.toMatch(/KEY/);
    expect(body.data.webhook_url).toContain("/api/telephony/telnyx/webhook");
  });
});

describe("POST /settings/telnyx (live verify)", () => {
  it("200s with latency when the Telnyx API responds", async () => {
    const res = await POST(req("POST"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ ok: true, latency_ms: 123 });
  });

  it("502s when Telnyx rejects the key", async () => {
    checkMock.mockResolvedValueOnce({
      configured: true,
      ok: false,
      latency_ms: 45,
      message: "Invalid Telnyx API key (rejected by Telnyx)",
      details: { api_key: true, connection_id: false, public_key: false, webrtc_sip_user: false },
    });
    const res = await POST(req("POST"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.message).toMatch(/Invalid Telnyx API key/);
  });

  it("422s when Telnyx is not configured at all", async () => {
    checkMock.mockResolvedValueOnce({
      configured: false,
      ok: false,
      latency_ms: null,
      message: "Telnyx not configured (TELNYX_API_KEY missing)",
      details: { api_key: false, connection_id: false, public_key: false, webrtc_sip_user: false },
    });
    const res = await POST(req("POST"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(422);
  });
});
