import { describe, it, expect, vi, beforeEach } from "vitest";

const guards: unknown[] = [];
const getPoolMock = vi.hoisted(() => vi.fn());
const listAllocationsMock = vi.hoisted(() => vi.fn());
const setPoolEnabledMock = vi.hoisted(() => vi.fn());
const setAllocationMock = vi.hoisted(() => vi.fn());
const findAgentMock = vi.hoisted(() => vi.fn());
const paymentsCreateMock = vi.hoisted(() => vi.fn());
const checkoutCreateMock = vi.hoisted(() => vi.fn(async () => ({ id: "cs_pool_1", url: "https://pay/pool" })));
const checkoutExpireMock = vi.hoisted(() => vi.fn(async () => ({})));
const syncMock = vi.hoisted(() => vi.fn(async () => ({ checked: 0, paused: [], unpaused: [], skipped: [] })));

vi.mock("@/server/repositories", () => ({
  agencyWallets: {
    getPool: getPoolMock,
    listAllocations: listAllocationsMock,
    setPoolEnabled: setPoolEnabledMock,
    setAllocation: setAllocationMock,
  },
  agents: { findById: findAgentMock },
}));

vi.mock("@/server/repositories/payments", () => ({
  payments: { create: paymentsCreateMock },
}));

vi.mock("@/server/stripe", () => ({
  getStripe: vi.fn(async () => ({ checkout: { sessions: { create: checkoutCreateMock, expire: checkoutExpireMock } } })),
}));

vi.mock("@/server/services/offer-wallet-sync", () => ({
  syncOfferWalletPauses: syncMock,
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>, options: unknown) => {
      guards.push(options);
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, {
            ...(ctx as object),
            user: { id: "u-head", role: "agent" },
            agencyId: "agency-1",
            membership: { id: "m-head" },
            isHead: true,
          });
        } catch (e: unknown) {
          const err = e as { message?: string; status?: number };
          return actual.fail(err.message ?? "Internal server error", err.status ?? 500);
        }
      };
    },
  };
});

const walletRoute = await import("./route");
const allocationsRoute = await import("./allocations/route");

function req(method: string, body?: unknown) {
  return new Request("http://x/api/v1/agency/wallet", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({}) };

beforeEach(() => {
  vi.clearAllMocks();
  // NOTE: `guards` is populated once at module import (apiHandler wraps at
  // definition time) — do NOT clear it here.
});

describe("agency pool wallet API (P1.4)", () => {
  it("guards every route with agency:manage (head only)", async () => {
    // Guards are captured at import time: GET + POST + PATCH (wallet) + PUT (allocations).
    expect(guards.length).toBe(4);
    for (const g of guards) {
      expect(g).toMatchObject({ resource: "agency", action: "manage", allowHead: true });
    }
  });

  it("GET returns pool + allocations + remaining headroom", async () => {
    getPoolMock.mockResolvedValue({ agency_id: "agency-1", balance_cents: 5000, enabled: true });
    listAllocationsMock.mockResolvedValue([
      { agent_id: "agent-1", allocated_cents: 2000 },
      { agent_id: "agent-2", allocated_cents: 1500 },
    ]);
    const res = await walletRoute.GET(req("GET"), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({
      pool: { balance_cents: 5000, enabled: true },
      total_allocated_cents: 3500,
      remaining_cents: 1500,
    });
  });

  it("POST creates a pool checkout without crediting anything", async () => {
    const res = await walletRoute.POST(req("POST", { amount_cents: 5000 }), ctx);
    expect(res.status).toBe(200);
    expect(checkoutCreateMock).toHaveBeenCalledTimes(1);
    const [args] = checkoutCreateMock.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(args.metadata).toMatchObject({ type: "agency_wallet_topup", agency_id: "agency-1" });
    // Phase 4: 5000 credit + 150 (3%) fee line item; payment stores both.
    const lineItems = args.line_items as { price_data: { unit_amount: number } }[];
    expect(lineItems.map((l) => l.price_data.unit_amount)).toEqual([5000, 150]);
    expect(paymentsCreateMock).toHaveBeenCalledWith({
      agency_id: "agency-1",
      stripe_session_id: "cs_pool_1",
      amount_cents: 5000,
      fee_cents: 150,
    });
    const body = await res.json();
    expect(body.data).toMatchObject({
      url: "https://pay/pool",
      sessionId: "cs_pool_1",
      credit_cents: 5000,
      fee_cents: 150,
      charged_cents: 5150,
    });
  });

  it("POST uses APP_BASE_URL for Stripe redirect URLs (never req origin)", async () => {
    const saved = process.env.APP_BASE_URL;
    process.env.APP_BASE_URL = "https://coveragecalls.com";
    try {
      const res = await walletRoute.POST(req("POST", { amount_cents: 5000 }), ctx);
      expect(res.status).toBe(200);
      const [args] = checkoutCreateMock.mock.calls[0] as unknown as [Record<string, unknown>];
      expect(args.success_url).toBe("https://coveragecalls.com/dashboard/wallet/pool?payment=success&session_id={CHECKOUT_SESSION_ID}");
      expect(args.cancel_url).toBe("https://coveragecalls.com/dashboard/wallet/pool?payment=cancelled");
    } finally {
      if (saved === undefined) delete process.env.APP_BASE_URL;
      else process.env.APP_BASE_URL = saved;
    }
  });

  it("POST expires the Stripe session when the payments row insert fails (no payable orphan)", async () => {
    paymentsCreateMock.mockRejectedValueOnce(new Error("db down"));
    const res = await walletRoute.POST(req("POST", { amount_cents: 5000 }), ctx);
    expect(res.status).toBe(500);
    expect(checkoutExpireMock).toHaveBeenCalledWith("cs_pool_1");
  });

  it("PUT allocates within the pool and re-syncs pauses", async () => {
    findAgentMock.mockResolvedValue({ id: "agent-1", agency_id: "agency-1" });
    getPoolMock.mockResolvedValue({ agency_id: "agency-1", balance_cents: 5000, enabled: true });
    listAllocationsMock.mockResolvedValue([{ agent_id: "agent-2", allocated_cents: 1500 }]);
    setAllocationMock.mockResolvedValue({ agent_id: "agent-1", allocated_cents: 2000 });
    const res = await allocationsRoute.PUT(req("PUT", { agent_id: "agent-1", allocated_cents: 2000 }), ctx);
    expect(res.status).toBe(200);
    expect(setAllocationMock).toHaveBeenCalledWith("agency-1", "agent-1", 2000);
    expect(syncMock).toHaveBeenCalledWith("agency-1");
  });

  it("PUT rejects allocations above the pool balance (no minting via allocation)", async () => {
    findAgentMock.mockResolvedValue({ id: "agent-1", agency_id: "agency-1" });
    getPoolMock.mockResolvedValue({ agency_id: "agency-1", balance_cents: 5000, enabled: true });
    listAllocationsMock.mockResolvedValue([{ agent_id: "agent-2", allocated_cents: 4000 }]);
    const res = await allocationsRoute.PUT(req("PUT", { agent_id: "agent-1", allocated_cents: 2000 }), ctx);
    expect(res.status).toBe(422);
    expect(setAllocationMock).not.toHaveBeenCalled();
  });

  it("PUT 404s cross-agency agents (no IDOR)", async () => {
    findAgentMock.mockRejectedValueOnce(new Error("not found"));
    const res = await allocationsRoute.PUT(req("PUT", { agent_id: "agent-other", allocated_cents: 100 }), ctx);
    expect(res.status).toBe(404);
    expect(setAllocationMock).not.toHaveBeenCalled();
  });
});
