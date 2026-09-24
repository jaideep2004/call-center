import { describe, it, expect, vi, beforeEach } from "vitest";

const retrieveMock = vi.hoisted(() => vi.fn());
const findBySessionIdMock = vi.hoisted(() => vi.fn());
const paymentsCreateMock = vi.hoisted(() => vi.fn());
const markCompletedMock = vi.hoisted(() => vi.fn());
const walletCreateMock = vi.hoisted(() => vi.fn());
const findAgentMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/stripe", () => ({
  getStripe: vi.fn(async () => ({ checkout: { sessions: { retrieve: retrieveMock } } })),
  getWebhookSecret: vi.fn(async () => "whsec_test"),
  invalidateStripeCache: vi.fn(),
}));

vi.mock("@/server/repositories/payments", () => ({
  payments: {
    findBySessionId: findBySessionIdMock,
    markCompleted: markCompletedMock,
    create: paymentsCreateMock,
  },
}));

vi.mock("@/server/repositories", () => ({
  walletEntries: { create: walletCreateMock },
  agencyWallets: { creditPool: vi.fn() },
  agents: { findByMembershipId: findAgentMock },
}));

vi.mock("@/server/services/offer-wallet-sync", () => ({
  syncOfferWalletPauses: vi.fn(async () => ({})),
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>, options: unknown) => {
      void options;
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

function req(body: unknown) {
  return new Request("http://x/api/v1/payments/reconcile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({}) };

const paidSession = {
  id: "cs_rec_1",
  payment_status: "paid",
  payment_intent: "pi_rec_1",
  amount_total: 103,
  metadata: { type: "agent_wallet_topup", agent_id: "agent-9", agency_id: "agency-1", credit_cents: "100", fee_cents: "3" },
};

beforeEach(() => {
  vi.clearAllMocks();
  findAgentMock.mockResolvedValue({ id: "agent-9" });
  retrieveMock.mockResolvedValue({ ...paidSession });
});

describe("POST /api/v1/payments/reconcile", () => {
  it("credits a paid session whose webhook never landed (Sept-22 $1 recovery)", async () => {
    findBySessionIdMock.mockResolvedValue(null);
    paymentsCreateMock.mockResolvedValue({
      id: "pay-healed", agency_id: "agency-1", agent_id: "agent-9",
      stripe_session_id: "cs_rec_1", amount_cents: 100, fee_cents: 3,
      currency: "usd", status: "pending",
    });
    const res = await POST(req({ session_id: "cs_rec_1" }), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ credited: true, amount_cents: 100 });
    expect(walletCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ agent_id: "agent-9", amount_cents: 100, idempotency_key: "stripe_cs_rec_1" }),
    );
  });

  it("is idempotent for already-completed payments", async () => {
    findBySessionIdMock.mockResolvedValue({
      id: "pay-1", agency_id: "agency-1", agent_id: "agent-9",
      stripe_session_id: "cs_rec_1", amount_cents: 100, fee_cents: 3,
      currency: "usd", status: "completed",
    });
    const res = await POST(req({ session_id: "cs_rec_1" }), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ credited: false });
    expect(walletCreateMock).not.toHaveBeenCalled();
  });

  it("422s unpaid sessions without touching the ledger", async () => {
    retrieveMock.mockResolvedValue({ ...paidSession, payment_status: "unpaid" });
    const res = await POST(req({ session_id: "cs_rec_1" }), ctx);
    expect(res.status).toBe(422);
    expect(walletCreateMock).not.toHaveBeenCalled();
    expect(paymentsCreateMock).not.toHaveBeenCalled();
  });

  it("403s an agent reconciling someone else's session", async () => {
    findAgentMock.mockResolvedValue({ id: "agent-other" });
    const res = await POST(req({ session_id: "cs_rec_1" }), ctx);
    expect(res.status).toBe(403);
    expect(walletCreateMock).not.toHaveBeenCalled();
  });
});
