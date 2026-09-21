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

const fakeEvent = {
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

  it("credits the pool ledger + balance exactly once", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(markCompletedMock).toHaveBeenCalledWith("pay-1", "pi_pool_9");
    expect(walletCreateMock).toHaveBeenCalledWith({
      agency_id: "agency-1",
      type: "top_up",
      amount_cents: 500000,
      currency: "usd",
      idempotency_key: "stripe_cs_pool_9",
      provider_reference: "pi_pool_9",
    });
    expect(creditPoolMock).toHaveBeenCalledWith("agency-1", 500000);
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

  it("404s unknown sessions", async () => {
    findBySessionIdMock.mockResolvedValue(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
    expect(creditPoolMock).not.toHaveBeenCalled();
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
    expect(walletCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ amount_cents: 25000 }),
    );
    expect(creditPoolMock).toHaveBeenCalledWith("agency-1", 25000);
  });
});
