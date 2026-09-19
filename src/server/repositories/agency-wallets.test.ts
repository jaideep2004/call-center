import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any[]>>();
const queryOneMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any>>();

vi.mock("@/server/db", () => ({
  query: (sql: string, params?: unknown[]) => queryMock(sql, params),
  queryOne: (sql: string, params?: unknown[]) => queryOneMock(sql, params),
}));

const { agencyWallets, effectiveBalanceSql } = await import("./agency-wallets");
const { walletEntries } = await import("./wallet-entries");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("agencyWallets pool (P1.4)", () => {
  it("getPool returns the existing row without inserting", async () => {
    const row = { agency_id: "agency-1", balance_cents: 5000, enabled: true };
    queryOneMock.mockResolvedValue(row);
    await expect(agencyWallets.getPool("agency-1")).resolves.toEqual(row);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("getPool creates a zeroed disabled pool on first use (never mints)", async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const created = { agency_id: "agency-1", balance_cents: 0, enabled: false };
    queryMock.mockResolvedValueOnce([created]);
    await expect(agencyWallets.getPool("agency-1")).resolves.toEqual(created);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("creditPool adds to the balance", async () => {
    queryOneMock
      .mockResolvedValueOnce({ agency_id: "agency-1", balance_cents: 0, enabled: true })
      .mockResolvedValueOnce({ agency_id: "agency-1", balance_cents: 5000, enabled: true });
    const row = await agencyWallets.creditPool("agency-1", 5000);
    expect(row.balance_cents).toBe(5000);
    const [, params] = queryOneMock.mock.calls[1] as [string, unknown[]];
    expect(params).toEqual(["agency-1", 5000]);
  });

  it("setAllocation upserts one agent row", async () => {
    const row = { id: "al-1", agency_id: "agency-1", agent_id: "agent-1", allocated_cents: 2000 };
    queryMock.mockResolvedValueOnce([row]);
    await expect(agencyWallets.setAllocation("agency-1", "agent-1", 2000)).resolves.toEqual(row);
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("ON CONFLICT (agency_id, agent_id)");
    expect(params).toEqual(["agency-1", "agent-1", 2000]);
  });

  it("sumAllocated totals the pool reservations", async () => {
    queryMock.mockResolvedValueOnce([{ total: "4500" }]);
    await expect(agencyWallets.sumAllocated("agency-1")).resolves.toBe(4500);
  });
});

describe("effective balance (P1.4)", () => {
  it("sumEffectiveByAgent adds personal ledger + allocation", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("agency_wallet_allocations")) return [{ allocated_cents: 1500 }];
      return [{ total: "2000" }];
    });
    await expect(walletEntries.sumEffectiveByAgent("agent-1")).resolves.toBe(3500);
  });

  it("sumEffectiveByAgent falls back to personal only without allocation", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("agency_wallet_allocations")) return [];
      return [{ total: "2000" }];
    });
    await expect(walletEntries.sumEffectiveByAgent("agent-1")).resolves.toBe(2000);
  });

  it("effectiveBalanceSql gates the allocation on the pool flag", () => {
    const sql = effectiveBalanceSql("a");
    expect(sql).toContain("app.wallet_entries");
    expect(sql).toContain("app.agency_wallet_allocations");
    expect(sql).toContain("app.agency_wallets");
    expect(sql).toContain("a.agency_id");
  });
});
