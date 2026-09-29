import { describe, it, expect, vi, beforeEach } from "vitest";

const findByAgentMock = vi.hoisted(() => vi.fn(async () => []));
const findAgentMock = vi.hoisted(() => vi.fn(async () => ({ id: "agent-own" })));
const findAgentByUserMock = vi.hoisted(() => vi.fn(async (): Promise<{ id: string } | null> => null));
const createAgentMock = vi.hoisted(() => vi.fn(async () => ({ id: "agent-new" })));
const findPlanMock = vi.hoisted(() => vi.fn());
const createSubMock = vi.hoisted(() => vi.fn(async () => ({ id: "sub-1" })));
const findActiveSubMock = vi.hoisted(() => vi.fn(async () => null));

vi.mock("@/server/repositories", () => ({
  agentSubscriptions: { findByAgent: findByAgentMock, findActiveByAgent: findActiveSubMock, create: createSubMock, expireStaleByAgent: vi.fn(async () => []) },
  agentPlans: { findById: findPlanMock },
  agents: { findByMembershipId: findAgentMock, findByUserId: findAgentByUserMock, create: createAgentMock },
}));

let ctxIsHead = false;
let ctxMembership: { id: string; agency_id: string; role: string } | null = { id: "m-1", agency_id: "agency-1", role: "agent" };

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
            membership: ctxMembership as never,
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

const { GET, POST } = await import("./route");

function get(qs = "") {
  return GET(
    new Request(`http://x/api/v1/agent-subscriptions${qs}`, { method: "GET" }),
    { params: Promise.resolve({}) } as never,
  );
}

function post(body: unknown) {
  return POST(
    new Request("http://x/api/v1/agent-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ctxIsHead = false;
  ctxMembership = { id: "m-1", agency_id: "agency-1", role: "agent" };
  findAgentMock.mockResolvedValue({ id: "agent-own" } as never);
  findAgentByUserMock.mockResolvedValue(null);
  createAgentMock.mockResolvedValue({ id: "agent-new" } as never);
  findPlanMock.mockResolvedValue({ id: "plan-free", agency_id: "agency-1", active: true, price_cents: 0, name: "Free" });
});

describe("GET /agent-subscriptions isolation", () => {
  it("forces a plain agent to their own subscriptions", async () => {
    const res = await get("?agent_id=agent-victim");
    expect(res.status).toBe(200);
    expect(findByAgentMock).toHaveBeenCalledWith("agent-own");
  });

  it("heads keep the requested view", async () => {
    ctxIsHead = true;
    const res = await get("?agent_id=agent-any");
    expect(res.status).toBe(200);
    expect(findByAgentMock).toHaveBeenCalledWith("agent-any");
  });
});

describe("POST /agent-subscriptions free-plan guard", () => {
  it("creates free ($0) plan subscriptions directly", async () => {
    const res = await post({ plan_id: "00000000-0000-0000-0000-000000000001" });
    expect(res.status).toBe(201);
    expect(createSubMock).toHaveBeenCalled();
  });

  it("402s paid plans (must go through Stripe checkout)", async () => {
    findPlanMock.mockResolvedValue({ id: "plan-paid", agency_id: "agency-1", active: true, price_cents: 5000, name: "Pro" });
    const res = await post({ plan_id: "00000000-0000-0000-0000-000000000002" });
    expect(res.status).toBe(402);
    expect(createSubMock).not.toHaveBeenCalled();
  });

  it("accepts free plans from another agency (shared catalog)", async () => {
    findPlanMock.mockResolvedValue({ id: "plan-free-x", agency_id: "agency-admin", active: true, price_cents: 0, name: "Free" });
    const res = await post({ plan_id: "00000000-0000-0000-0000-000000000003" });
    expect(res.status).toBe(201);
    expect(createSubMock).toHaveBeenCalled();
  });

  it("400s inactive plans", async () => {
    findPlanMock.mockResolvedValue({ id: "plan-old", agency_id: "agency-1", active: false, price_cents: 0, name: "Old" });
    const res = await post({ plan_id: "00000000-0000-0000-0000-000000000004" });
    expect(res.status).toBe(400);
    expect(createSubMock).not.toHaveBeenCalled();
  });

  it("subscribes membership-less signups via their login profile", async () => {
    ctxMembership = null;
    findAgentByUserMock.mockResolvedValue({ id: "agent-pending" });
    const res = await post({ plan_id: "00000000-0000-0000-0000-000000000001" });
    expect(res.status).toBe(201);
    expect(createAgentMock).not.toHaveBeenCalled();
    expect(createSubMock).toHaveBeenCalledWith(
      expect.objectContaining({ agent_id: "agent-pending", plan_id: "plan-free" }),
    );
  });

  it("creates the login profile on demand for fresh signups", async () => {
    ctxMembership = null;
    findAgentByUserMock.mockResolvedValue(null);
    const res = await post({ plan_id: "00000000-0000-0000-0000-000000000001" });
    expect(res.status).toBe(201);
    expect(createAgentMock).toHaveBeenCalledWith(
      expect.objectContaining({ agency_id: null, membership_id: null, user_id: "u-1" }),
    );
  });

  it("retires stale active rows and retries instead of 500 lockout (M1)", async () => {
    const { agentSubscriptions } = await import("@/server/repositories");
    const dup = new Error("duplicate key");
    (dup as { code?: string }).code = "23505";
    createSubMock.mockRejectedValueOnce(dup);
    vi.mocked(agentSubscriptions.expireStaleByAgent).mockResolvedValueOnce(["sub-old"]);
    createSubMock.mockResolvedValueOnce({ id: "sub-new" });
    const res = await post({ plan_id: "00000000-0000-0000-0000-000000000001" });
    expect(res.status).toBe(201);
    expect(vi.mocked(agentSubscriptions.expireStaleByAgent)).toHaveBeenCalledWith("agent-own");
  });

  it("409s when the race loser finds a true active sub on retry", async () => {
    const { agentSubscriptions } = await import("@/server/repositories");
    const dup = new Error("duplicate key");
    (dup as { code?: string }).code = "23505";
    createSubMock.mockRejectedValue(dup);
    vi.mocked(agentSubscriptions.expireStaleByAgent).mockResolvedValue([]);
    const res = await post({ plan_id: "00000000-0000-0000-0000-000000000001" });
    expect(res.status).toBe(409);
    expect(createSubMock).toHaveBeenCalledTimes(2);
  });
});
