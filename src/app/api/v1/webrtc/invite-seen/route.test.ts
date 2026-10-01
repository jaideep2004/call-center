import { describe, it, expect, vi, beforeEach } from "vitest";

const findByMembershipMock = vi.hoisted(() => vi.fn(async () => ({ id: "agent-1" })));
const queryMock = vi.hoisted(() => vi.fn(async () => [{ id: "call-1" }]));

vi.mock("@/server/repositories", () => ({
  agents: { findByMembershipId: findByMembershipMock },
}));

vi.mock("@/server/db", () => ({
  query: queryMock,
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
            user: { id: "u-1", role: "agent" },
            agencyId: "agency-1",
            membership: { id: "m-1" },
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

const { POST } = await import("./route");

function post(body: unknown) {
  return POST(
    new Request("http://x/api/v1/webrtc/invite-seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /webrtc/invite-seen", () => {
  it("stamps the agent's ringing calls and logs the beacon", async () => {
    const info = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const res = await post({ sdkCallId: "sdk-leg-1", state: "ringing" });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual({ stamped: 1 });
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining("routing_snapshot"),
        ["agent-1", expect.stringContaining("invite_seen_at")],
      );
      expect(info.mock.calls.map((c) => String(c[0])).some((s) => s.includes("[invite]") && s.includes("sdk-leg-1".slice(0, 12)))).toBe(true);
    } finally {
      info.mockRestore();
    }
  });

  it("422s on an empty beacon", async () => {
    const res = await post({});
    expect(res.status).toBe(422);
  });
});
