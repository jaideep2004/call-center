import { describe, it, expect, vi, beforeEach } from "vitest";

const checkMock = vi.hoisted(() => vi.fn(async (): Promise<{
  configured: boolean;
  ok: boolean;
  latency_ms: number | null;
  message: string;
}> => ({
  configured: true,
  ok: true,
  latency_ms: 210,
  message: "Connected",
})));

vi.mock("@/server/services/retreaver", () => ({
  checkRetreaverConnection: checkMock,
}));

vi.mock("@/domain/providers/retreaver", () => ({
  retreaver: { configured: () => true },
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
  return new Request("http://x/api/v1/settings/retreaver", { method });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /settings/retreaver", () => {
  it("reports key presence without ever returning secrets", async () => {
    const res = await GET(req("GET"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.configured).toBe(true);
    expect(JSON.stringify(body.data)).not.toMatch(/RETREAVER_API_KEY|wh-secret|sk_/);
  });
});

describe("POST /settings/retreaver (live verify)", () => {
  it("200s with latency when the Retreaver API responds", async () => {
    const res = await POST(req("POST"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ ok: true, latency_ms: 210 });
  });

  it("502s when Retreaver rejects the key", async () => {
    checkMock.mockResolvedValueOnce({
      configured: true,
      ok: false,
      latency_ms: null,
      message: "invalid API key",
    });
    const res = await POST(req("POST"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.message).toMatch(/invalid API key/);
  });

  it("422s when Retreaver is not configured at all", async () => {
    checkMock.mockResolvedValueOnce({
      configured: false,
      ok: false,
      latency_ms: null,
      message: "Retreaver not configured (RETREAVER_API_KEY / RETREAVER_COMPANY_ID missing)",
    });
    const res = await POST(req("POST"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(422);
  });
});
