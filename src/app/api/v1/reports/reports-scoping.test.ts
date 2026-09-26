import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const queryOneMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  query: (sql: string, params?: unknown[]) => queryMock(sql, params),
  queryOne: (sql: string, params?: unknown[]) => queryOneMock(sql, params),
}));

let ctxRole = "admin";
let ctxAgency: string | null = null;

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
            agencyId: ctxAgency,
            membership: { id: "m-1", agency_id: "agency-1", role: "agent" },
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

const summaryRoute = await import("@/app/api/v1/reports/summary/route");
const volumeRoute = await import("@/app/api/v1/reports/calls-volume/route");

function getReq(path: string) {
  return [
    new Request(`http://x${path}`, { method: "GET" }),
    { params: Promise.resolve({}) },
  ] as const;
}

beforeEach(() => {
  vi.clearAllMocks();
  ctxRole = "admin";
  ctxAgency = null;
  queryOneMock.mockResolvedValue({ total_calls: 1, total_revenue_cents: 2, active_campaigns: 3, agents_online: 4, total_leads: 5 });
  queryMock.mockResolvedValue([]);
});

describe("reports agency scoping", () => {
  it("admins see platform-wide summary (no agency filter)", async () => {
    const [req, ctx] = getReq("/api/v1/reports/summary");
    const res = await summaryRoute.GET(req, ctx as never);
    expect(res.status).toBe(200);
    const [sql, params] = queryOneMock.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).not.toContain("agency_id");
    expect(params).toEqual([]);
  });

  it("agents see only their agency summary", async () => {
    ctxRole = "agent";
    ctxAgency = "agency-9";
    const [req, ctx] = getReq("/api/v1/reports/summary");
    const res = await summaryRoute.GET(req, ctx as never);
    expect(res.status).toBe(200);
    const [sql, params] = queryOneMock.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql.match(/agency_id/g)?.length).toBeGreaterThanOrEqual(5);
    expect(params).toEqual(["agency-9", "agency-9", "agency-9", "agency-9", "agency-9"]);
  });

  it("agents see only their agency call volume", async () => {
    ctxRole = "agent";
    ctxAgency = "agency-9";
    const [req, ctx] = getReq("/api/v1/reports/calls-volume?days=7");
    const res = await volumeRoute.GET(req, ctx as never);
    expect(res.status).toBe(200);
    const [sql, params] = queryMock.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("agency_id = $2");
    expect(params).toEqual([7, "agency-9"]);
  });
});

