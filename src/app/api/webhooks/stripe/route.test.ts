import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  walletCreateMock,
  findBySessionIdMock,
  markCompletedMock,
} = vi.hoisted(() => ({
  walletCreateMock: vi.fn(),
  findBySessionIdMock: vi.fn(),
  markCompletedMock: vi.fn(),
}));

const fakeEvent = {
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_test_123",
      payment_intent: "pi_test_123",
      metadata: {},
      amount_total: 5000,
    },
  },
};

vi.mock("@/server/stripe", () => {
  const client = {
    webhooks: { constructEvent: vi.fn(() => fakeEvent) },
  };
  return {
    getStripe: vi.fn(async () => client),
    getWebhookSecret: vi.fn(async () => "whsec_test"),
    invalidateStripeCache: vi.fn(),
  };
});

vi.mock("@/server/repositories/payments", () => ({
  payments: {
    findBySessionId: findBySessionIdMock,
    markCompleted: markCompletedMock,
    create: vi.fn(),
  },
}));

vi.mock("@/server/repositories", () => ({
  walletEntries: { create: walletCreateMock },
  agentSubscriptions: { findActiveByAgent: vi.fn(), create: vi.fn() },
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

describe("stripe webhook — agency top-up idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeEvent.data.object.metadata = {};
    // Pending payment row; markCompleted flips it so redelivery sees 'completed'.
    const payment = { id: "pay-1", agency_id: "agency-1", amount_cents: 5000, currency: "usd", status: "pending" };
    findBySessionIdMock.mockImplementation(async () => ({ ...payment }));
    markCompletedMock.mockImplementation(async () => {
      payment.status = "completed";
      return { ...payment, status: "completed" };
    });
  });

  it("credits the wallet exactly once across duplicate deliveries", async () => {
    const res1 = await POST(makeRequest());
    expect(res1.status).toBe(200);
    const res2 = await POST(makeRequest());
    expect(res2.status).toBe(200);

    expect(markCompletedMock).toHaveBeenCalledTimes(1);
    expect(walletCreateMock).toHaveBeenCalledTimes(1);
    expect(walletCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ idempotency_key: "stripe_cs_test_123" }),
    );
  });

  it("returns 200 received for an already-completed payment (no double credit)", async () => {
    findBySessionIdMock.mockResolvedValue({ id: "pay-1", agency_id: "agency-1", amount_cents: 5000, currency: "usd", status: "completed" });
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(walletCreateMock).not.toHaveBeenCalled();
  });

  it("rejects requests with a missing signature", async () => {
    const res = await POST(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
  });

  it("rejects invalid signatures", async () => {
    const { getStripe } = await import("@/server/stripe");
    const client = await getStripe();
    vi.mocked(client.webhooks.constructEvent).mockImplementationOnce(() => {
      throw new Error("bad signature");
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });
});

describe("stripe webhook — agent top-up credits the AGENT wallet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeEvent.data.object.metadata = { type: "agent_wallet_topup", agent_id: "agent-9", agency_id: "agency-1" };
    findBySessionIdMock.mockResolvedValue({ id: "pay-2", agency_id: "agency-1", agent_id: "agent-9", amount_cents: 2500, currency: "usd", status: "pending" });
    markCompletedMock.mockResolvedValue({});
  });

  it("creates a top_up entry bound to the agent", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(walletCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agency_id: "agency-1",
        agent_id: "agent-9",
        type: "top_up",
        idempotency_key: "stripe_cs_test_123",
      }),
    );
  });
});
