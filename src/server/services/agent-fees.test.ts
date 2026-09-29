import { describe, it, expect, vi, beforeEach } from "vitest";

const clientQueryMock = vi.hoisted(() => vi.fn());
const sendMock = vi.hoisted(() => vi.fn(async () => ({ sent: true })));

vi.mock("@/server/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  transaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) =>
    fn({ query: clientQueryMock }),
  ),
}));

vi.mock("@/server/repositories/agent-fees", () => ({
  agentFees: { ensureMonthlyFee: vi.fn() },
}));

vi.mock("@/server/services/invoice-delivery", () => ({
  sendWeeklyInvoice: sendMock,
}));

const { generateWeeklyInvoices } = await import("./agent-fees");

const FEES = [
  { id: "fee-1", agency_id: "agency-1", amount_cents: 5000 },
  { id: "fee-2", agency_id: "agency-1", amount_cents: 3000 },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateWeeklyInvoices claim-first (H4)", () => {
  function mockRun(fees = FEES) {
    clientQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("FOR UPDATE SKIP LOCKED")) return { rows: fees };
      if (sql.includes("INSERT INTO app.invoices")) return { rows: [{ id: "inv-1" }] };
      return { rows: [] };
    });
  }

  it("rolls one pending invoice per agency and emails it", async () => {
    mockRun();
    const out = await generateWeeklyInvoices(new Date("2026-09-28T00:00:00Z"));
    expect(out).toMatchObject({ invoices: 1, feesIncluded: 2, emailsSent: 1 });
    expect(sendMock).toHaveBeenCalledWith("inv-1");
    const updateCall = clientQueryMock.mock.calls.find(([sql]) =>
      (sql as string).includes("UPDATE app.agent_fees"),
    );
    expect(updateCall).toBeTruthy();
  });

  it("claims with SKIP LOCKED so a concurrent run takes nothing", async () => {
    mockRun([]);
    const out = await generateWeeklyInvoices(new Date("2026-09-28T00:00:00Z"));
    expect(out).toMatchObject({ invoices: 0, feesIncluded: 0, emailsSent: 0 });
    const selectCall = clientQueryMock.mock.calls.find(([sql]) =>
      (sql as string).includes("FROM app.agent_fees"),
    );
    expect(selectCall?.[0] as string).toContain("FOR UPDATE SKIP LOCKED");
  });
});
