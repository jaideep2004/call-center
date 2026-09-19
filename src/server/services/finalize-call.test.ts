import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  incrementCallsUsedMock,
  walletCreateMock,
  sumByAgentMock,
  findByIdMock,
  findActiveByAgentMock,
  campaignFindByIdMock,
  bidOverrideMock,
  dispositionFindMock,
  payoutFindMock,
} = vi.hoisted(() => ({
  incrementCallsUsedMock: vi.fn(),
  walletCreateMock: vi.fn(),
  sumByAgentMock: vi.fn(),
  findByIdMock: vi.fn(),
  findActiveByAgentMock: vi.fn(),
  campaignFindByIdMock: vi.fn().mockResolvedValue(null),
  bidOverrideMock: vi.fn().mockResolvedValue(null),
  dispositionFindMock: vi.fn().mockResolvedValue(null),
  payoutFindMock: vi.fn().mockResolvedValue([]),
}));

const invoiceInsertMock = vi.fn();
const clientQueryMock = vi.fn();

vi.mock("@/server/db", () => ({
  transaction: vi.fn(async (fn: (client: any) => Promise<unknown>) => fn({ query: clientQueryMock })),
}));

vi.mock("@/server/repositories", () => ({
  calls: { findById: findByIdMock },
  campaigns: { findById: campaignFindByIdMock },
  bidOverrides: { findLatest: bidOverrideMock },
  dispositions: { findByCallId: dispositionFindMock },
  dispositionPayouts: { findByAgency: payoutFindMock },
  agentSubscriptions: {
    findActiveByAgent: findActiveByAgentMock,
    incrementCallsUsed: incrementCallsUsedMock,
  },
  walletEntries: {
    sumByAgent: sumByAgentMock,
    create: walletCreateMock,
  },
}));

const { finalizeCall } = await import("./call-orchestrator");

const endedCall = {
  id: "call-1",
  agency_id: "agency-1",
  campaign_id: "camp-1",
  agent_id: "agent-1",
  provider: "telnyx",
  provider_call_id: "pcid",
  provider_agent_call_id: null,
  state: "ended",
  from_hash: "h",
  to_number: null,
  caller_state: "IL",
  ring_started_at: null,
  started_at: "2026-08-24T00:00:00Z",
  connected_at: "2026-08-24T00:00:00Z",
  ended_at: "2026-08-24T00:01:40Z",
  routing_snapshot: {},
  qualification_snapshot: {},
  retreaver_call_id: null,
};

function mockInvoiceInsert(rows: unknown[]) {
  invoiceInsertMock.mockReturnValue(rows);
  clientQueryMock.mockImplementation((sql: string) => {
    if (sql.includes("INSERT INTO app.invoices")) return Promise.resolve({ rows });
    if (sql.includes("COALESCE(SUM(amount_cents)")) return Promise.resolve({ rows: [{ balance: 100000 }] });
    return Promise.resolve({ rows: [] });
  });
}

describe("finalizeCall idempotency & balance handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findByIdMock.mockResolvedValue(endedCall);
    findActiveByAgentMock.mockResolvedValue(null);
    sumByAgentMock.mockResolvedValue(500);
  });

  it("skips when the invoice already exists (redelivered finalize)", async () => {
    mockInvoiceInsert([]);
    const result = await finalizeCall("call-1");
    expect(result).toMatchObject({ skipped: true, reason: "already_finalized" });
    expect(incrementCallsUsedMock).not.toHaveBeenCalled();
    expect(walletCreateMock).not.toHaveBeenCalled();
  });

  it("charges the agent exactly once across duplicate finalize calls", async () => {
    let first = true;
    clientQueryMock.mockImplementation((sql: string) => {
      if (sql.includes("INSERT INTO app.invoices")) {
        const rows = first ? [{ id: "inv-1", status: "paid" }] : [];
        first = false;
        return Promise.resolve({ rows });
      }
      if (sql.includes("COALESCE(SUM(amount_cents)")) return Promise.resolve({ rows: [{ balance: 100000 }] });
      return Promise.resolve({ rows: [] });
    });
    findActiveByAgentMock.mockResolvedValue({ id: "sub-1" });

    await finalizeCall("call-1");
    const second = await finalizeCall("call-1");

    expect(second).toMatchObject({ skipped: true });
    expect(incrementCallsUsedMock).toHaveBeenCalledTimes(1);
  });

  it("marks the invoice failed instead of throwing when balance is insufficient", async () => {
    mockInvoiceInsert([{ id: "inv-1", status: "paid" }]);
    clientQueryMock.mockImplementation((sql: string) => {
      if (sql.includes("INSERT INTO app.invoices")) return Promise.resolve({ rows: [{ id: "inv-1", status: "paid" }] });
      if (sql.includes("COALESCE(SUM(amount_cents)")) return Promise.resolve({ rows: [{ balance: 50 }] });
      if (sql.includes("SET status = 'failed'")) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    const result = await finalizeCall("call-1");
    expect(result).toMatchObject({ insufficientBalance: true });
    expect((result as any).invoice.status).toBe("failed");
    expect(clientQueryMock).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'failed'"),
      expect.anything(),
    );
  });

  it("creates a charge entry for the agency wallet on successful billing", async () => {
    mockInvoiceInsert([{ id: "inv-1", status: "paid" }]);
    const result = await finalizeCall("call-1");
    expect(result).toMatchObject({ totalCents: expect.any(Number) });
    const chargeCall = walletCreateMock.mock.calls.find(
      (args: any[]) => args[0]?.type === "charge",
    );
    expect(chargeCall).toBeDefined();
  });
});

describe("finalizeCall marketplace margin (P1.5)", () => {
  const marketCampaign = {
    id: "camp-1",
    price_cents: 3500,
    max_publisher_payout_cents: 2000,
    min_connected_seconds: 60,
    buffer_seconds: 30,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    findByIdMock.mockResolvedValue(endedCall);
    findActiveByAgentMock.mockResolvedValue(null);
    sumByAgentMock.mockResolvedValue(500);
    campaignFindByIdMock.mockResolvedValue(marketCampaign);
    bidOverrideMock.mockResolvedValue(null);
    dispositionFindMock.mockResolvedValue(null);
    payoutFindMock.mockResolvedValue([]);
    mockInvoiceInsert([{ id: "inv-1", status: "paid" }]);
  });

  function snapshotMerges() {
    return clientQueryMock.mock.calls.filter(
      (args: unknown[]) => typeof args[0] === "string" && (args[0] as string).includes("qualification_snapshot"),
    );
  }

  it("records winning bid/payout/margin on a qualified call", async () => {
    const result = await finalizeCall("call-1");
    expect(result).toMatchObject({
      marketplace: { revenue_cents: 3500, cost_cents: 2000, margin_cents: 1500, qualified: true, reason: null },
    });
    // Merged into qualification_snapshot exactly once.
    expect(snapshotMerges()).toHaveLength(1);
    const [, params] = snapshotMerges()[0] as [string, [string, string, string]];
    expect(JSON.parse(params[1])).toMatchObject({
      marketplace: { revenue_cents: 3500, cost_cents: 2000, margin_cents: 1500 },
    });
  });

  it("lets the manual bid override win for margin math", async () => {
    bidOverrideMock.mockResolvedValue({ price_cents: 5000, payout_cents: 1800 });
    const result = await finalizeCall("call-1");
    expect(result).toMatchObject({
      marketplace: { revenue_cents: 5000, cost_cents: 1800, margin_cents: 3200, qualified: true, reason: null },
    });
  });

  it("records explicit zeros for calls below min_connected_seconds", async () => {
    findByIdMock.mockResolvedValue({
      ...endedCall,
      connected_at: "2026-08-24T00:00:00Z",
      ended_at: "2026-08-24T00:00:20Z", // 20s < 60s min
    });
    const result = await finalizeCall("call-1");
    expect(result).toMatchObject({
      totalCents: 0,
      marketplace: { revenue_cents: 0, cost_cents: 0, margin_cents: 0, qualified: false, reason: "below_min_connected" },
    });
  });

  it("records nulls with a reason when payout is unconfigured", async () => {
    campaignFindByIdMock.mockResolvedValue({ ...marketCampaign, max_publisher_payout_cents: null });
    const result = await finalizeCall("call-1");
    expect(result).toMatchObject({
      marketplace: { revenue_cents: null, cost_cents: null, margin_cents: null, qualified: false, reason: "unconfigured" },
    });
  });

  it("leaves margin null for disposition-based calls (own payout economics)", async () => {
    dispositionFindMock.mockResolvedValue({ id: "d-1", outcome: "sale", admin_confirmed: true });
    payoutFindMock.mockResolvedValue([{ outcome: "sale", amount_cents: 2500 }]);
    const result = await finalizeCall("call-1");
    expect(result).toMatchObject({
      marketplace: { revenue_cents: null, cost_cents: null, margin_cents: null, qualified: false, reason: "disposition_based" },
    });
  });

  it("never double-records margin on redelivered finalize", async () => {
    let first = true;
    clientQueryMock.mockImplementation((sql: string) => {
      if (sql.includes("INSERT INTO app.invoices")) {
        const rows = first ? [{ id: "inv-1", status: "paid" }] : [];
        first = false;
        return Promise.resolve({ rows });
      }
      if (sql.includes("COALESCE(SUM(amount_cents)")) return Promise.resolve({ rows: [{ balance: 100000 }] });
      return Promise.resolve({ rows: [] });
    });
    await finalizeCall("call-1");
    const second = await finalizeCall("call-1");
    expect(second).toMatchObject({ skipped: true, reason: "already_finalized" });
    expect(snapshotMerges()).toHaveLength(1);
  });
});
