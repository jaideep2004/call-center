import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.hoisted(() => vi.fn(async () => []));

vi.mock("@/server/db", () => ({
  query: queryMock,
}));

let routeCtx: { user: { id: string; role: string }; agencyId: string | null };

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, { ...(ctx as object), ...routeCtx });
        } catch (e: unknown) {
          const err = e as { message?: string; status?: number };
          return actual.fail(err.message ?? "Internal server error", err.status ?? 500);
        }
      };
    },
  };
});

const route = await import("./route");

function req(url: string) {
  return new Request(url, { method: "GET" });
}
const ctx = { params: Promise.resolve({}) };

beforeEach(() => {
  vi.clearAllMocks();
  queryMock.mockResolvedValue([]);
  routeCtx = { user: { id: "u-1", role: "agent" }, agencyId: "agency-1" };
});

describe("GET /api/v1/leads/export (Phase 3, point 7)", () => {
  it("rejects unsupported formats instead of silently serving CSV", async () => {
    const res = await route.GET(req("http://x/api/v1/leads/export?format=json"), ctx);
    expect(res.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("serves xlsx with the spreadsheet content type", async () => {
    const res = await route.GET(req("http://x/api/v1/leads/export?format=xlsx"), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("spreadsheetml.sheet");
  });

  it("lets privileged admins without agency scope export across agencies", async () => {
    routeCtx = { user: { id: "u-admin", role: "admin" }, agencyId: null };
    const res = await route.GET(req("http://x/api/v1/leads/export"), ctx);
    expect(res.status).toBe(200);
    const [sql, params] = queryMock.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).not.toContain("l.agency_id");
    expect(params).toEqual([]);
  });

  it("still requires agency scope for non-privileged users", async () => {
    routeCtx = { user: { id: "u-1", role: "agent" }, agencyId: null };
    const res = await route.GET(req("http://x/api/v1/leads/export"), ctx);
    expect(res.status).toBe(403);
  });
});
