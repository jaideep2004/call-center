import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyMock = vi.hoisted(() => vi.fn(async () => ({ rows: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } })));
const findAgentMock = vi.hoisted(() => vi.fn(async () => ({ id: "agent-own" })));

vi.mock("@/server/repositories", () => ({
  walletEntries: { findMany: findManyMock },
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

function get() {
  return GET(
    new Request("http://x/api/v1/wallet/entries?page=1&limit=10", { method: "GET" }),
    { params: Promise.resolve({}) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ctxRole = "agent";
  ctxIsHead = false;
  findAgentMock.mockResolvedValue({ id: "agent-own" } as never);
});

describe("GET /wallet/entries agent isolation", () => {
  it("forces a plain agent to their own ledger rows", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { agency_id: "agency-1", agent_id: "agent-own" },
      }),
    );
  });

  it("heads keep the agency-wide ledger", async () => {
    ctxIsHead = true;
    const res = await get();
    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { agency_id: "agency-1" } }),
    );
  });

  it("403s a non-head agent with no agent profile", async () => {
    findAgentMock.mockResolvedValue(null as never);
    const res = await get();
    expect(res.status).toBe(403);
  });
});
