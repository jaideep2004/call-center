import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.hoisted(() => vi.fn(async () => []));

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
          });
        } catch (e: unknown) {
          const err = e as { message?: string; status?: number };
          return actual.fail(err.message ?? "Internal server error", err.status ?? 500);
        }
      };
    },
  };
});

const route = await import("./route");

const ctx = { params: Promise.resolve({}) };

beforeEach(() => {
  vi.clearAllMocks();
  queryMock.mockResolvedValue([]);
});

describe("GET /api/v1/reports/export/calls (Phase 3, point 7)", () => {
  it("honors format=xlsx with the spreadsheet content type", async () => {
    const res = await route.GET(
      new Request("http://x/api/v1/reports/export/calls?format=xlsx", { method: "GET" }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("spreadsheetml.sheet");
    expect(res.headers.get("Content-Disposition")).toContain(".xlsx");
  });

  it("still serves CSV by default", async () => {
    const res = await route.GET(
      new Request("http://x/api/v1/reports/export/calls", { method: "GET" }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
  });
});
