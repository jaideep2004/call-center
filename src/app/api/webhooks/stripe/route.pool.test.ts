import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  walletCreateMock,
  creditPoolMock,
  findBySessionIdMock,
  markCompletedMock,
  syncMock,
} = vi.hoisted(() => ({
  walletCreateMock: vi.fn(),
  creditPoolMock: vi.fn(),
  findBySessionIdMock: vi.fn(),
  markCompletedMock: vi.fn(),
  syncMock: vi.fn(async () => ({ checked: 0, paused: [], unpaused: [], skipped: [] })),
}));

const fakeEvent: {
  type: string;
  data: { object: { id: string; payment_intent: string; metadata: Record<string, string>; amount_total: number } };
} = {
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_pool_9",
      payment_intent: "pi_pool_9",
      metadata: { type: "agency_wallet_topup", agency_id: "agency-1" },
      amount_total: 500000,
    },
  },
};

vi.mock("@/server/stripe", () => ({
  getStripe: vi.fn(async () => ({ webhooks: { constructEvent: vi.fn(() => fakeEvent) } })),
  getWebhookSecret: vi.fn(async () => "whsec_test"),
  invalidateStripeCache: vi.fn(),
}));

vi.mock("@/server/repositories/payments", () => ({
  payments: {
    findBySessionId: findBySessionIdMock,
    markCompleted: markCompletedMock,
    create: vi.fn(),
  },
}));

vi.mock("@/server/repositories", () => ({
  walletEntries: { create: walletCreateMock },
  agencyWallets: { creditPool: creditPoolMock },
  agentSubscriptions: { findActiveByAgent: vi.fn(), create: vi.fn() },
}));

vi.mock("@/server/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  transaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => fn({})),
}));

vi.mock("@/server/services/offer-wallet-sync", () => ({
  syncOfferWalletPauses: syncMock,
}));

process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

const { POST } = await import("@/app/api/webhooks/stripe/route");

function makeRequest(): Request {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "sig" },
    body: "{}",
  });
}

describe("stripe webhook — agency pool top-up (P1.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findBySessionIdMock.mockResolvedValue({
      id: "pay-1",
      agency_id: "agency-1",
      agent_id: null,
      status: "pending",
      amount_cents: 500000,
      currency: "usd",
    });
  });

  it("credits ONLY the pool balance (single pot — no agency-ledger double-mint)", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(markCompletedMock).toHaveBeenCalledWith("pay-1", "pi_pool_9", expect.anything());
    expect(walletCreateMock).not.toHaveBeenCalled();
    expect(creditPoolMock).toHaveBeenCalledWith("agency-1", 500000, expect.anything());
    expect(syncMock).toHaveBeenCalledWith("agency-1");
  });

  it("ignores redelivery of a completed payment (no double credit)", async () => {
    findBySessionIdMock.mockResolvedValue({
      id: "pay-1",
      agency_id: "agency-1",
      agent_id: null,
      status: "completed",
      amount_cents: 500000,
      currency: "usd",
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(markCompletedMock).not.toHaveBeenCalled();
    expect(walletCreateMock).not.toHaveBeenCalled();
    expect(creditPoolMock).not.toHaveBeenCalled();
  });

  it("heals orphan sessions (Sept-22 $1 hole): missing row is rebuilt from metadata", async () => {
    findBySessionIdMock.mockResolvedValue(null);
    fakeEvent.data.object.metadata = { type: "agency_wallet_topup", agency_id: "agency-1", credit_cents: "500000", fee_cents: "0" };
    const createMock = vi.mocked((await import("@/server/repositories/payments")).payments.create);
    createMock.mockResolvedValue({
      id: "pay-healed",
      agency_id: "agency-1",
      agent_id: null,
      status: "pending",
      amount_cents: 500000,
      fee_cents: 0,
      currency: "usd",
    } as never);
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ stripe_session_id: "cs_pool_9", amount_cents: 500000 }),
    );
    expect(walletCreateMock).not.toHaveBeenCalled();
    expect(creditPoolMock).toHaveBeenCalledWith("agency-1", 500000, expect.anything());
    fakeEvent.data.object.metadata = { type: "agency_wallet_topup", agency_id: "agency-1" };
  });

  it("404s unknown sessions with unusable metadata", async () => {
    findBySessionIdMock.mockResolvedValue(null);
    fakeEvent.data.object.metadata = { type: "mystery" } as never;
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
    expect(creditPoolMock).not.toHaveBeenCalled();
    fakeEvent.data.object.metadata = { type: "agency_wallet_topup", agency_id: "agency-1" };
  });

  it("credits the NET amount — the 3% fee is never minted (Phase 4)", async () => {
    // New-shape row: user asked for 25000 credit, Stripe charged 25750 gross.
    findBySessionIdMock.mockResolvedValue({
      id: "pay-fee",
      agency_id: "agency-1",
      agent_id: null,
      status: "pending",
      amount_cents: 25000,
      fee_cents: 750,
      currency: "usd",
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    // Single pot: pool only, never an agency-ledger entry.
    expect(walletCreateMock).not.toHaveBeenCalled();
    expect(creditPoolMock).toHaveBeenCalledWith("agency-1", 25000, expect.anything());
  });
});
