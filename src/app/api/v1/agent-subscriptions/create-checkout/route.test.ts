import { describe, it, expect, vi, beforeEach } from "vitest";

const findPlanMock = vi.hoisted(() => vi.fn());
const findAgentMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/repositories", () => ({
  agentPlans: { findById: findPlanMock },
  agents: { findByMembershipId: findAgentMock },
}));

vi.mock("@/server/repositories/payments", () => ({
  payments: { create: vi.fn() },
}));

vi.mock("@/server/stripe", () => ({
  getStripe: vi.fn(async () => ({ checkout: { sessions: { create: vi.fn(async () => ({ id: "cs_1", url: "https://pay/x" })) } } })),
  getWebhookSecret: vi.fn(async () => "whsec"),
  invalidateStripeCache: vi.fn(),
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

const { POST } = await import("./route");

function post(body: unknown) {
  return POST(
    new Request("http://x/api/v1/agent-subscriptions/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  findAgentMock.mockResolvedValue({ id: "agent-1" });
});

describe("POST subscription checkout guards", () => {
  it("422s $0 plans (free plans subscribe directly, never via Stripe)", async () => {
    findPlanMock.mockResolvedValue({ id: "00000000-0000-0000-0000-000000000001", agency_id: "agency-1", active: true, price_cents: 0, name: "Free" });
    const res = await post({ plan_id: "00000000-0000-0000-0000-000000000001" });
    expect(res.status).toBe(422);
  });

  it("starts checkout for priced plans", async () => {
    findPlanMock.mockResolvedValue({ id: "00000000-0000-0000-0000-000000000002", agency_id: "agency-1", active: true, price_cents: 5000, name: "Pro" });
    const res = await post({ plan_id: "00000000-0000-0000-0000-000000000002" });
    expect(res.status).toBe(200);
  });
});
