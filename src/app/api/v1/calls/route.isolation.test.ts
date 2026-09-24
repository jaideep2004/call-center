import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyMock = vi.hoisted(() => vi.fn(async () => ({ rows: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } })));
const findAgentMock = vi.hoisted(() => vi.fn(async () => ({ id: "agent-own" })));

vi.mock("@/server/repositories", () => ({
  calls: { findMany: findManyMock },
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
    new Request(`http://x/api/v1/calls${qs}`, { method: "GET" }),
    { params: Promise.resolve({}) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ctxRole = "agent";
  ctxIsHead = false;
  findAgentMock.mockResolvedValue({ id: "agent-own" } as never);
});

describe("GET /calls agent isolation", () => {
  it("forces a plain agent to their own calls when agent_id is omitted", async () => {
    const res = await get("?limit=5");
    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ filters: expect.objectContaining({ agent_id: "agent-own" }) }),
    );
  });

  it("overrides a forged agent_id with the caller's own agent", async () => {
    const res = await get("?agent_id=agent-victim");
    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ filters: expect.objectContaining({ agent_id: "agent-own" }) }),
    );
  });

  it("heads keep the agency-wide view", async () => {
    ctxIsHead = true;
    const res = await get("?limit=5");
    expect(res.status).toBe(200);
    const call0 = findManyMock.mock.calls[0] as unknown as [{ filters: Record<string, unknown> }];
    expect(call0[0].filters.agent_id).toBeUndefined();
  });

  it("admins keep the unfiltered view", async () => {
    ctxRole = "admin";
    const res = await get("?agent_id=agent-any");
    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ filters: expect.objectContaining({ agent_id: "agent-any" }) }),
    );
  });

  it("403s a non-head agent with no agent profile", async () => {
    findAgentMock.mockResolvedValue(null as never);
    const res = await get("?limit=5");
    expect(res.status).toBe(403);
  });
});
