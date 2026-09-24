import { describe, it, expect, vi, beforeEach } from "vitest";

const findByAgentMock = vi.hoisted(() => vi.fn(async () => []));
const findAgentMock = vi.hoisted(() => vi.fn(async () => ({ id: "agent-own" })));
const findPlanMock = vi.hoisted(() => vi.fn());
const createSubMock = vi.hoisted(() => vi.fn(async () => ({ id: "sub-1" })));
const findActiveSubMock = vi.hoisted(() => vi.fn(async () => null));

vi.mock("@/server/repositories", () => ({
  agentSubscriptions: { findByAgent: findByAgentMock, findActiveByAgent: findActiveSubMock, create: createSubMock },
  agentPlans: { findById: findPlanMock },
  agents: { findByMembershipId: findAgentMock },
}));

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
            user: { id: "u-1", role: "agent" },
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
  findAgentMock.mockResolvedValue({ id: "agent-own" } as never);
  findPlanMock.mockResolvedValue({ id: "plan-free", agency_id: "agency-1", price_cents: 0, name: "Free" });
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
    findPlanMock.mockResolvedValue({ id: "plan-paid", agency_id: "agency-1", price_cents: 5000, name: "Pro" });
    const res = await post({ plan_id: "00000000-0000-0000-0000-000000000002" });
    expect(res.status).toBe(402);
    expect(createSubMock).not.toHaveBeenCalled();
  });
});
