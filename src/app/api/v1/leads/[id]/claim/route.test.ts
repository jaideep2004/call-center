import { describe, it, expect, vi, beforeEach } from "vitest";

const findAgentMock = vi.hoisted(() => vi.fn());
const findLeadMock = vi.hoisted(() => vi.fn());
const dbQueryOneMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/repositories", () => ({
  leads: { findById: findLeadMock },
  agents: { findByMembershipId: findAgentMock },
}));

vi.mock("@/server/db", () => ({
  query: vi.fn(async () => []),
  queryOne: dbQueryOneMock,
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return (req: Request, ctx: unknown) =>
        handler(req, {
          ...(ctx as object),
          user: { id: "u-1", role: "agent" },
          agencyId: "agency-1",
          membership: { id: "m-1", agency_id: "agency-1", role: "agent" },
          isHead: false,
        }).catch((e: unknown) => {
          const err = e as { message?: string; status?: number };
          return actual.fail(err.message ?? "Internal server error", err.status ?? 500);
        });
    },
  };
});

const route = await import("./route");

function post(id: string) {
  return route.POST(
    new Request(`http://x/api/v1/leads/${id}/claim`, { method: "POST" }),
    { params: Promise.resolve({ id }) } as never,
  );
}

const lead = { id: "lead-1", agency_id: "agency-1", assigned_agent_id: null, status: "new" };

beforeEach(() => {
  vi.clearAllMocks();
  findAgentMock.mockResolvedValue({ id: "agent-own", membership_id: "m-1" });
  findLeadMock.mockResolvedValue({ ...lead });
  dbQueryOneMock.mockResolvedValue({ id: "lead-1" });
});

describe("POST /api/v1/leads/[id]/claim", () => {
  it("claims an unassigned lead to the caller's own profile", async () => {
    const res = await post("lead-1");
    expect(res.status).toBe(200);
    expect(dbQueryOneMock).toHaveBeenCalledWith(
      expect.stringContaining("assigned_agent_id IS NULL"),
      ["lead-1", "agent-own", "agency-1"],
    );
    const body = await res.json();
    expect(body.message).toMatch(/claimed/i);
  });

  it("409s when the lead is already assigned", async () => {
    findLeadMock.mockResolvedValue({ ...lead, assigned_agent_id: "agent-other" });
    const res = await post("lead-1");
    expect(res.status).toBe(409);
    expect(dbQueryOneMock).not.toHaveBeenCalled();
  });

  it("409s on a lost claim race (someone claimed first)", async () => {
    dbQueryOneMock.mockResolvedValue(null);
    const res = await post("lead-1");
    expect(res.status).toBe(409);
  });

  it("404s unknown leads", async () => {
    findLeadMock.mockResolvedValue(null);
    const res = await post("lead-1");
    expect(res.status).toBe(404);
  });

  it("403s callers without an agent profile", async () => {
    findAgentMock.mockResolvedValue(null);
    const res = await post("lead-1");
    expect(res.status).toBe(404);
  });
});
