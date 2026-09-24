import { describe, it, expect, vi, beforeEach } from "vitest";

const findCallMock = vi.hoisted(() => vi.fn());
const findAgentMock = vi.hoisted(() => vi.fn());
const acceptCallMock = vi.hoisted(() => vi.fn(async () => ({ id: "call-1", state: "connected" })));

vi.mock("@/server/repositories", () => ({
  calls: { findById: findCallMock },
  agents: { findById: findAgentMock },
}));

vi.mock("@/server/services/call-orchestrator", () => ({
  acceptCall: acceptCallMock,
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
            membership: { id: "m-1" },
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

function post() {
  return POST(new Request("http://x/api/v1/calls/call-1/accept", { method: "POST" }), {
    params: Promise.resolve({ id: "call-1" }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  findCallMock.mockResolvedValue({ id: "call-1", state: "ringing", agent_id: "agent-1" });
  findAgentMock.mockResolvedValue({ id: "agent-1", membership_id: "m-1" });
});

describe("POST accept (non-blocking bridge)", () => {
  it("returns 202 immediately without awaiting the bridge", async () => {
    let resolveBridge!: (v: { id: string; state: string }) => void;
    acceptCallMock.mockReturnValueOnce(new Promise((r) => { resolveBridge = r; }));
    const res = await post();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ accepted: true, call_id: "call-1" });
    resolveBridge({ id: "call-1", state: "connected" });
    await Promise.resolve();
  });

  it("dedups concurrent accepts into one bridge loop", async () => {
    let resolveBridge!: (v: { id: string; state: string }) => void;
    acceptCallMock.mockReturnValue(new Promise((r) => { resolveBridge = r; }));
    const [r1, r2] = await Promise.all([post(), post()]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(acceptCallMock).toHaveBeenCalledTimes(1);
    resolveBridge({ id: "call-1", state: "connected" });
    await Promise.resolve();
  });

  it("409s when the call already moved on (no late bridge after miss)", async () => {
    findCallMock.mockResolvedValue({ id: "call-1", state: "missed", agent_id: "agent-1" });
    const res = await post();
    expect(res.status).toBe(409);
    expect(acceptCallMock).not.toHaveBeenCalled();
  });

  it("403s another agent's call", async () => {
    findAgentMock.mockResolvedValue({ id: "agent-1", membership_id: "m-other" });
    const res = await post();
    expect(res.status).toBe(403);
    expect(acceptCallMock).not.toHaveBeenCalled();
  });
});
