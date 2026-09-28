import { describe, it, expect, vi, beforeEach } from "vitest";

const findActiveMock = vi.hoisted(() => vi.fn(async (): Promise<any[]> => []));
const findByAgencyMock = vi.hoisted(() => vi.fn(async (): Promise<any[]> => []));

vi.mock("@/server/repositories", () => ({
  agentPlans: { findActive: findActiveMock, findByAgency: findByAgencyMock },
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return (req: Request, ctx: unknown) =>
        handler(req, {
          ...(ctx as object),
          user: { id: "u-9", role: "agent" },
          // Agency-less direct signup: no membership, no agency.
          agencyId: (globalThis as { __agencyId?: string | null }).__agencyId ?? null,
          membership: null,
          isHead: false,
        }).catch((e: unknown) => {
          const err = e as { message?: string; status?: number };
          return actual.fail(err.message ?? "Internal server error", err.status ?? 500);
        });
    },
  };
});

const { GET } = await import("./route");

function get(qs = "") {
  return GET(
    new Request(`http://x/api/v1/agent-plans${qs}`, { method: "GET" }),
    { params: Promise.resolve({}) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as { __agencyId?: string | null }).__agencyId = null;
});

describe("GET /api/v1/agent-plans catalog scope", () => {
  it("returns the shared active catalog to agency-less signups", async () => {
    findActiveMock.mockResolvedValue([{ id: "plan-1", name: "Starter" }]);
    const res = await get("?active=true");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([{ id: "plan-1", name: "Starter" }]);
    expect(findByAgencyMock).not.toHaveBeenCalled();
  });

  it("management list without ?active stays agency-scoped", async () => {
    (globalThis as { __agencyId?: string | null }).__agencyId = "agency-1";
    findByAgencyMock.mockResolvedValue([{ id: "plan-9" }]);
    const res = await get("");
    expect(res.status).toBe(200);
    expect(findByAgencyMock).toHaveBeenCalledWith("agency-1", false);
    expect(findActiveMock).not.toHaveBeenCalled();
  });
});
