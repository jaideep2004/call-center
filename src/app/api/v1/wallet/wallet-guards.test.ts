import { describe, it, expect, vi, beforeEach } from "vitest";

const sumByAgencyMock = vi.hoisted(() => vi.fn(async () => 1000));
const agentsFindManyMock = vi.hoisted(() => vi.fn(async () => ({ rows: [], pagination: {} })));

vi.mock("@/server/repositories", () => ({
  walletEntries: { sumByAgency: sumByAgencyMock },
  agents: { findMany: agentsFindManyMock },
}));

vi.mock("@/server/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
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

const balanceRoute = await import("@/app/api/v1/wallet/balance/route");
const agentsRoute = await import("@/app/api/v1/wallet/agents/route");

function getReq(path: string) {
  return [
    new Request(`http://x${path}`, { method: "GET" }),
    { params: Promise.resolve({}) },
  ] as const;
}

beforeEach(() => {
  vi.clearAllMocks();
  ctxRole = "agent";
  ctxIsHead = false;
});

describe("wallet team endpoints are head/admin-only", () => {
  it("plain agents get 403 on agency balance", async () => {
    const [req, ctx] = getReq("/api/v1/wallet/balance");
    const res = await balanceRoute.GET(req, ctx as never);
    expect(res.status).toBe(403);
    expect(sumByAgencyMock).not.toHaveBeenCalled();
  });

  it("plain agents get 403 on the agents earnings list", async () => {
    const [req, ctx] = getReq("/api/v1/wallet/agents");
    const res = await agentsRoute.GET(req, ctx as never);
    expect(res.status).toBe(403);
    expect(agentsFindManyMock).not.toHaveBeenCalled();
  });

  it("heads keep both views", async () => {
    ctxIsHead = true;
    const [req1, ctx1] = getReq("/api/v1/wallet/balance");
    expect((await balanceRoute.GET(req1, ctx1 as never)).status).toBe(200);
    const [req2, ctx2] = getReq("/api/v1/wallet/agents");
    expect((await agentsRoute.GET(req2, ctx2 as never)).status).toBe(200);
  });

  it("admins keep both views", async () => {
    ctxRole = "admin";
    const [req1, ctx1] = getReq("/api/v1/wallet/balance");
    expect((await balanceRoute.GET(req1, ctx1 as never)).status).toBe(200);
    const [req2, ctx2] = getReq("/api/v1/wallet/agents");
    expect((await agentsRoute.GET(req2, ctx2 as never)).status).toBe(200);
  });
});

