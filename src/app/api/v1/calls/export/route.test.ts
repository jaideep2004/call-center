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

vi.mock("@/lib/csv", () => ({
  toCsv: vi.fn(() => "csv-bytes"),
}));

vi.mock("@/lib/excel", () => ({
  toExcelBuffer: vi.fn(async () => Buffer.from("xlsx-bytes")),
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

function get(format: string) {
  return GET(
    new Request(`http://x/api/v1/calls/export?format=${format}`, { method: "GET" }),
    { params: Promise.resolve({}) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ctxRole = "agent";
  ctxIsHead = false;
  findAgentMock.mockResolvedValue({ id: "agent-own" } as never);
});

describe("GET /calls/export (Sept-24 500 regression)", () => {
  it("orders by started_at — app.calls has no created_at column", async () => {
    for (const format of ["csv", "xlsx"]) {
      const res = await get(format);
      expect(res.status).toBe(200);
    }
    const [sql] = queryMock.mock.calls[0] as unknown as [string];
    expect(sql).toContain("ORDER BY c.started_at DESC NULLS LAST");
    expect(sql).not.toContain("c.created_at");
  });

  it("forces a plain agent to their own calls", async () => {
    const res = await get("csv");
    expect(res.status).toBe(200);
    const [sql, params] = queryMock.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("c.agent_id = $2");
    expect(params).toEqual(["agency-1", "agent-own"]);
  });

  it("admins export agency-wide without agent scoping", async () => {
    ctxRole = "admin";
    const res = await get("xlsx");
    expect(res.status).toBe(200);
    const [sql, params] = queryMock.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).not.toContain("c.agent_id = $");
    expect(params).toEqual(["agency-1"]);
  });

  it("caps rows so one export cannot dump the table", async () => {
    await get("csv");
    const [sql] = queryMock.mock.calls[0] as unknown as [string];
    expect(sql).toContain("LIMIT 5000");
  });

  it("400s unsupported formats", async () => {
    const res = await get("json");
    expect(res.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
