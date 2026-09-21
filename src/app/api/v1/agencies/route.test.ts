import { describe, it, expect, vi, beforeEach } from "vitest";

const agenciesCreateMock = vi.hoisted(() => vi.fn());
const getBooleanMock = vi.hoisted(() => vi.fn(async () => true));
const clientQueryMock = vi.hoisted(() =>
  vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: Array<{ id?: string; one?: number }> }>>(
    async () => ({ rows: [] }),
  ),
);
const dbQueryMock = vi.hoisted(() =>
  vi.fn<(sql: string, params?: unknown[]) => Promise<Array<{ one?: number }>>>(async () => []),
);

vi.mock("@/server/repositories", () => ({
  agencies: { create: agenciesCreateMock },
  systemSettings: { getBoolean: getBooleanMock },
}));

vi.mock("@/server/db", () => ({
  transaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) =>
    fn({ query: clientQueryMock }),
  ),
  query: dbQueryMock,
}));

let agentCtx: { user: { id: string; role: string }; agencyId: string | null; membership: { id: string } | undefined };

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return (req: Request, ctx: unknown) => handler(req, { ...(ctx as object), ...agentCtx });
    },
  };
});

const route = await import("./route");

function req(body: unknown) {
  return new Request("http://x/api/v1/agencies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({}) };

beforeEach(() => {
  vi.clearAllMocks();
  getBooleanMock.mockResolvedValue(true);
  clientQueryMock.mockResolvedValue({ rows: [] });
  dbQueryMock.mockResolvedValue([]);
  agenciesCreateMock.mockResolvedValue({ id: "agency-2", name: "New Co", slug: "new-co" });
  agentCtx = {
    user: { id: "u-1", role: "agent" },
    agencyId: "agency-1",
    membership: { id: "m-1" },
  };
});

describe("POST /api/v1/agencies leave-and-create (Phase 3, point 6)", () => {
  it("blocks active members without explicit leave confirmation", async () => {
    const res = await route.POST(req({ name: "New Co", slug: "new-co" }), ctx);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { message?: string };
    expect(body.message).toContain("LEAVE_REQUIRED");
    expect(agenciesCreateMock).not.toHaveBeenCalled();
  });

  it("moves the membership on explicit leave-and-create", async () => {
    const res = await route.POST(req({ name: "New Co", slug: "new-co", leaveAgency: true }), ctx);
    expect(res.status).toBe(201);
    expect(agenciesCreateMock).toHaveBeenCalledWith({ name: "New Co", slug: "new-co" }, expect.anything());
    const sqls = clientQueryMock.mock.calls.map((c) => c[0]);
    expect(sqls.some((s) => s.includes("UPDATE app.memberships SET agency_id"))).toBe(true);
    expect(sqls.some((s) => s.includes('UPDATE "user" SET role'))).toBe(true);
  });

  it("refuses to strand an agency the user heads", async () => {
    dbQueryMock.mockResolvedValue([{ one: 1 }]);
    const res = await route.POST(req({ name: "New Co", slug: "new-co", leaveAgency: true }), ctx);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { message?: string };
    expect(body.message).toContain("transfer headship");
    expect(agenciesCreateMock).not.toHaveBeenCalled();
  });

  it("creates a head membership for accounts with none", async () => {
    agentCtx = { user: { id: "u-9", role: "agent" }, agencyId: null, membership: undefined };
    clientQueryMock.mockResolvedValue({ rows: [{ id: "m-new" }] });
    const res = await route.POST(req({ name: "Fresh Co", slug: "fresh-co" }), ctx);
    expect(res.status).toBe(201);
    const sqls = clientQueryMock.mock.calls.map((c) => c[0]);
    expect(sqls.some((s) => s.includes("INSERT INTO app.memberships"))).toBe(true);
  });
});
