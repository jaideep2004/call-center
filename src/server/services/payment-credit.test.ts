import { describe, it, expect, vi, beforeEach } from "vitest";

const walletCreateMock = vi.hoisted(() => vi.fn());
const markCompletedMock = vi.hoisted(() => vi.fn());
const findBySessionIdMock = vi.hoisted(() => vi.fn());
const paymentsCreateMock = vi.hoisted(() => vi.fn());
const creditPoolMock = vi.hoisted(() => vi.fn());
const sendTopupMock = vi.hoisted(() => vi.fn(async () => undefined));
const syncMock = vi.hoisted(() => vi.fn(async () => ({})));

vi.mock("@/server/repositories/payments", () => ({
  payments: {
    findBySessionId: findBySessionIdMock,
    markCompleted: markCompletedMock,
    create: paymentsCreateMock,
  },
}));

vi.mock("@/server/repositories", () => ({
  walletEntries: { create: walletCreateMock },
  agencyWallets: { creditPool: creditPoolMock },
}));

vi.mock("@/server/services/action-emails", () => ({
  sendWalletTopup: sendTopupMock,
}));

vi.mock("@/server/services/offer-wallet-sync", () => ({
  syncOfferWalletPauses: syncMock,
}));

const { creditTopupPayment, findOrCreateTopupPayment } = await import("./payment-credit");

const pending = {
  id: "pay-1", agency_id: "agency-1", agent_id: "agent-9", plan_id: null,
  stripe_session_id: "cs_1", stripe_payment_intent_id: null,
  amount_cents: 100, fee_cents: 3, livemode: true,
  currency: "usd", status: "pending", created_at: "", completed_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("creditTopupPayment duplicate convergence", () => {
  it("loser of a concurrent credit reports credited:false and sends no second receipt", async () => {
    const dup = new Error("duplicate key");
    (dup as { code?: string }).code = "23505";
    walletCreateMock.mockRejectedValueOnce(dup);
    const res = await creditTopupPayment({ ...pending }, "agent", "pi_1", "cs_1");
    expect(res).toEqual({ credited: false });
    expect(markCompletedMock).toHaveBeenCalledWith("pay-1", "pi_1");
    expect(sendTopupMock).not.toHaveBeenCalled();
  });

  it("winner credits, completes, and mails exactly once", async () => {
    const res = await creditTopupPayment({ ...pending }, "agent", "pi_1", "cs_1");
    expect(res).toEqual({ credited: true });
    expect(walletCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ idempotency_key: "stripe_cs_1" }),
    );
    expect(markCompletedMock).toHaveBeenCalledWith("pay-1", "pi_1");
    expect(sendTopupMock).toHaveBeenCalledTimes(1);
  });

  it("already-completed payments short-circuit with no writes and no mail", async () => {
    const res = await creditTopupPayment({ ...pending, status: "completed" }, "agent", "pi_1", "cs_1");
    expect(res).toEqual({ credited: false });
    expect(walletCreateMock).not.toHaveBeenCalled();
    expect(markCompletedMock).not.toHaveBeenCalled();
    expect(sendTopupMock).not.toHaveBeenCalled();
  });
});

describe("findOrCreateTopupPayment orphan race", () => {
  it("concurrent healers converge: loser re-reads the winner's row", async () => {
    findBySessionIdMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...pending, id: "pay-winner" });
    const dup = new Error("duplicate key");
    (dup as { code?: string }).code = "23505";
    paymentsCreateMock.mockRejectedValueOnce(dup);
    const found = await findOrCreateTopupPayment({
      id: "cs_1",
      metadata: { type: "agent_wallet_topup", agent_id: "agent-9", agency_id: "agency-1", credit_cents: "100", fee_cents: "3" },
    });
    expect(found?.payment.id).toBe("pay-winner");
    expect(found?.kind).toBe("agent");
  });
});
