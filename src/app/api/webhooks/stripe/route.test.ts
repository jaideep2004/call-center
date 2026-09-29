import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  walletCreateMock,
  findBySessionIdMock,
  markCompletedMock,
  setLivemodeMock,
} = vi.hoisted(() => ({
  walletCreateMock: vi.fn(),
  findBySessionIdMock: vi.fn(),
  markCompletedMock: vi.fn(),
  setLivemodeMock: vi.fn(),
}));

const fakeEvent: {
  type: string;
  data: { object: { id: string; payment_intent: string | null; metadata: Record<string, string>; amount_total: number; livemode?: boolean | null } };
} = {
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
    charges: { retrieve: vi.fn(async () => ({ id: "ch_1", payment_intent: "pi_1" })) },
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
    findByPaymentIntentId: vi.fn(),
    markCompleted: markCompletedMock,
    markRefunded: vi.fn(),
    setLivemode: setLivemodeMock,
    create: vi.fn(),
  },
}));

vi.mock("@/server/repositories", () => ({
  walletEntries: { create: walletCreateMock },
  agencyWallets: { creditPool: vi.fn(), debitPool: vi.fn() },
  agentSubscriptions: { findActiveByAgent: vi.fn(), findByAgent: vi.fn(async () => []), update: vi.fn(), create: vi.fn() },
}));

vi.mock("@/server/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  transaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) =>
    fn({
      query: vi.fn(async (sql: string) =>
        typeof sql === "string" && sql.includes("INSERT INTO app.payment_reversals")
          ? { rows: [{ id: "rev-1" }] }
          : { rows: [] },
      ),
    }),
  ),
}));

vi.mock("@/server/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  transaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) =>
    fn({
      query: vi.fn(async (sql: string) =>
        typeof sql === "string" && sql.includes("INSERT INTO app.payment_reversals")
          ? { rows: [{ id: "rev-1" }] }
          : { rows: [] },
      ),
    }),
  ),
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
    expect(markCompletedMock).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything());
    expect(walletCreateMock).toHaveBeenCalledTimes(1);
    expect(walletCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ idempotency_key: "stripe_cs_test_123" }),
      expect.anything(),
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
      expect.anything(),
    );
  });

  it("converges on wallet idempotency conflict (crash between credit and status flip)", async () => {
    const dup = new Error("duplicate key value violates unique constraint");
    (dup as { code?: string }).code = "23505";
    walletCreateMock.mockRejectedValueOnce(dup);
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(markCompletedMock).toHaveBeenCalled();
  });

  it("stamps livemode from the Stripe session (test money never mixes into live)", async () => {
    setLivemodeMock.mockResolvedValue(undefined);
    fakeEvent.data.object.livemode = false;
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(setLivemodeMock).toHaveBeenCalledWith("cs_test_123", false);
    expect(walletCreateMock).toHaveBeenCalled();
    fakeEvent.data.object.livemode = undefined;
  });
});

describe("stripe webhook — subscription orphan heal + single receipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeEvent.data.object.metadata = {
      type: "subscription", agent_id: "agent-9", plan_id: "plan-1",
      agency_id: "agency-1", credit_cents: "5000", fee_cents: "0",
    };
    findBySessionIdMock.mockResolvedValue(null);
  });

  it("heals a missing payments row from metadata instead of activating invisibly", async () => {
    const { payments } = await import("@/server/repositories/payments");
    vi.mocked(payments.create).mockResolvedValue({
      id: "pay-sub", agency_id: "agency-1", agent_id: "agent-9", plan_id: "plan-1",
      stripe_session_id: "cs_test_123", amount_cents: 5000, fee_cents: 0,
      currency: "usd", status: "pending", livemode: true,
    } as never);
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(vi.mocked(payments.create)).toHaveBeenCalledWith(
      expect.objectContaining({ stripe_session_id: "cs_test_123", plan_id: "plan-1" }),
    );
    expect(markCompletedMock).toHaveBeenCalled();
  });
});

describe("stripe webhook — refunds reverse ledger (H3)", () => {
  const refundEvent = {
    type: "charge.refunded",
    data: {
      object: {
        id: "ch_1",
        payment_intent: "pi_1",
        amount_refunded: 2500,
        refunds: { data: [{ id: "re_1", amount: 2500 }] },
      },
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { getStripe } = await import("@/server/stripe");
    const client = await getStripe();
    vi.mocked(client.webhooks.constructEvent).mockImplementation(() => refundEvent as never);
    const { payments } = await import("@/server/repositories/payments");
    vi.mocked(payments.findByPaymentIntentId).mockResolvedValue({
      id: "pay-9", agency_id: "agency-1", agent_id: "agent-9", plan_id: null,
      stripe_session_id: "cs_9", stripe_payment_intent_id: "pi_1",
      amount_cents: 2500, fee_cents: 0, currency: "usd", status: "completed", livemode: true,
    } as never);
  });

  it("writes a refund entry and marks the payment refunded", async () => {
    const { payments } = await import("@/server/repositories/payments");
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(walletCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "refund", amount_cents: -2500, agent_id: "agent-9" }),
      expect.anything(),
    );
    expect(vi.mocked(payments.markRefunded)).toHaveBeenCalledWith("pay-9", expect.anything());
  });

  it("acks unknown payment intents without action (no retry storm)", async () => {
    const { payments } = await import("@/server/repositories/payments");
    vi.mocked(payments.findByPaymentIntentId).mockResolvedValue(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(walletCreateMock).not.toHaveBeenCalled();
  });

  it("dispute withdrawals reverse like refunds", async () => {
    const { getStripe } = await import("@/server/stripe");
    const client = await getStripe();
    vi.mocked(client.webhooks.constructEvent).mockImplementation(() => ({
      type: "charge.dispute.funds_withdrawn",
      data: { object: { id: "dp_1", charge: "ch_1", amount: 2500 } },
    }) as never);
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(walletCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "refund", amount_cents: -2500 }),
      expect.anything(),
    );
  });
});
