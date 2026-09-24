import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.hoisted(() => vi.fn(async () => []));
const findAgentMock = vi.hoisted(() => vi.fn(async () => ({ id: "agent-own" })));

vi.mock("@/server/db", () => ({
  query: queryMock,
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/server/repositories", () => ({
  agents: { findByMembershipId: findAgentMock },
}));

let ctxRole = "agent";
let ctxIsHead = false;

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, {
            ...(ctx as object),
            user: { id: "u-1", role: ctxRole },
            agencyId: "agency-1",
            membership: { id: "m-1", agency_id: "agency-1", role: "agent" },
            isHead: ctxIsHead,
          });
        } catch (e: unknown) {
          const err = e as { message?: string; status?: number };
          return actual.fail(err.message ?? "Internal server error", err.status ?? 500);
        }
      };
    },
  };
});

const { GET } = await import("./route");

function get(qs = "") {
  return GET(
    new Request(`http://x/api/v1/agents/earnings${qs}`, { method: "GET" }),
    { params: Promise.resolve({}) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ctxRole = "agent";
  ctxIsHead = false;
  findAgentMock.mockResolvedValue({ id: "agent-own" } as never);
});

describe("GET /agents/earnings agent isolation", () => {
  it("forces a plain agent to their own earnings", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    const [sql, params] = queryMock.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("c.agent_id");
    expect(params).toContain("agent-own");
  });

  it("overrides a forged agent_id with the caller's own agent", async () => {
    const res = await get("?agent_id=agent-victim");
    expect(res.status).toBe(200);
    const [, params] = queryMock.mock.calls[0] as unknown as [string, unknown[]];
    expect(params).toContain("agent-own");
    expect(params).not.toContain("agent-victim");
  });

  it("heads keep the agency-wide view", async () => {
    ctxIsHead = true;
    const res = await get();
    expect(res.status).toBe(200);
    const [, params] = queryMock.mock.calls[0] as unknown as [string, unknown[]];
    expect(params).toEqual(["agency-1"]);
  });
});
