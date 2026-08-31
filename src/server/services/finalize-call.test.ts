import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  incrementCallsUsedMock,
  walletCreateMock,
  sumByAgentMock,
  findByIdMock,
  findActiveByAgentMock,
} = vi.hoisted(() => ({
  incrementCallsUsedMock: vi.fn(),
  walletCreateMock: vi.fn(),
  sumByAgentMock: vi.fn(),
  findByIdMock: vi.fn(),
  findActiveByAgentMock: vi.fn(),
}));

const invoiceInsertMock = vi.fn();
const clientQueryMock = vi.fn();

vi.mock("@/server/db", () => ({
  transaction: vi.fn(async (fn: (client: any) => Promise<unknown>) => fn({ query: clientQueryMock })),
}));

vi.mock("@/server/repositories", () => ({
  calls: { findById: findByIdMock },
  campaigns: { findById: vi.fn().mockResolvedValue(null) },
  bidOverrides: { findLatest: vi.fn().mockResolvedValue(null) },
  dispositions: { findByCallId: vi.fn().mockResolvedValue(null) },
  dispositionPayouts: { findByAgency: vi.fn().mockResolvedValue([]) },
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
