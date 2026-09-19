import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any[]>>();
const queryOneMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any>>();

vi.mock("@/server/db", () => ({
  query: (sql: string, params?: unknown[]) => queryMock(sql, params),
  queryOne: (sql: string, params?: unknown[]) => queryOneMock(sql, params),
}));

const { agents } = await import("./agents");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("agents.update suspend auto-offline", () => {
  it("forces availability=offline when suspending (even if Go Online was on)", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "ag-1", approval_status: "suspended", availability: "offline" });
    const row = await agents.update("ag-1", { approval_status: "suspended" }, "agency-1");
    expect(row.availability).toBe("offline");
    const [sql, params] = queryOneMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("approval_status = $2");
    expect(sql).toContain("availability = $3");
    expect(params).toEqual(["ag-1", "suspended", "offline", "agency-1"]);
  });

  it("forces offline on reject too, via updateApproval", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "ag-1", approval_status: "rejected", availability: "offline" });
    await agents.updateApproval("ag-1", "rejected", "agency-1");
    const [, params] = queryOneMock.mock.calls[0] as [string, unknown[]];
    expect(params).toContain("offline");
  });

  it("approve never touches availability", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "ag-1", approval_status: "approved" });
    await agents.update("ag-1", { approval_status: "approved" }, "agency-1");
    const [sql, params] = queryOneMock.mock.calls[0] as [string, unknown[]];
    expect(sql).not.toContain("availability");
    expect(params).toEqual(["ag-1", "approved", "agency-1"]);
  });

  it("plain availability edits pass through untouched", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "ag-1", availability: "available" });
    await agents.updateAvailability("ag-1", "available", "agency-1");
    const [sql, params] = queryOneMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("availability = $2");
    expect(params).toEqual(["ag-1", "available", "agency-1"]);
  });
});
