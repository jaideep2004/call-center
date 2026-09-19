import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any[]>>();
const queryOneMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any>>();

vi.mock("@/server/db", () => ({
  query: (sql: string, params?: unknown[]) => queryMock(sql, params),
  queryOne: (sql: string, params?: unknown[]) => queryOneMock(sql, params),
}));

const { campaigns } = await import("./campaigns");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("campaigns multi-publisher repo (publisher + campaigns logic)", () => {
  it("setPublisherIds dedups, syncs legacy to first, replaces join rows in order", async () => {
    queryMock.mockResolvedValue([]);
    const out = await campaigns.setPublisherIds("camp-1", ["pub-b", "pub-a", "pub-b", ""]);
    expect(out).toEqual(["pub-b", "pub-a"]);
    expect(queryMock).toHaveBeenCalledTimes(4); // UPDATE + DELETE + 2 INSERTs
    const [updateSql, updateParams] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(updateSql).toContain("UPDATE app.campaigns SET publisher_id");
    expect(updateParams).toEqual(["camp-1", "pub-b"]);
    const [deleteSql, deleteParams] = queryMock.mock.calls[1] as [string, unknown[]];
    expect(deleteSql).toContain("DELETE FROM app.campaign_publishers");
    expect(deleteParams).toEqual(["camp-1"]);
    const [, insertParams1] = queryMock.mock.calls[2] as [string, unknown[]];
    const [, insertParams2] = queryMock.mock.calls[3] as [string, unknown[]];
    expect(insertParams1).toEqual(["camp-1", "pub-b"]);
    expect(insertParams2).toEqual(["camp-1", "pub-a"]);
  });

  it("setPublisherIds([]) clears legacy to null with no inserts", async () => {
    queryMock.mockResolvedValue([]);
    const out = await campaigns.setPublisherIds("camp-1", []);
    expect(out).toEqual([]);
    expect(queryMock).toHaveBeenCalledTimes(2); // UPDATE + DELETE only
    const [, updateParams] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(updateParams).toEqual(["camp-1", null]);
  });

  it("getPublisherIds returns join rows in creation order", async () => {
    queryMock.mockResolvedValueOnce([{ publisher_id: "pub-a" }, { publisher_id: "pub-b" }]);
    await expect(campaigns.getPublisherIds("camp-1")).resolves.toEqual(["pub-a", "pub-b"]);
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("FROM app.campaign_publishers");
    expect(sql).toContain("ORDER BY created_at ASC");
    expect(params).toEqual(["camp-1"]);
  });

  it("findByPublisher unions join table with legacy fallback", async () => {
    queryMock.mockResolvedValueOnce([]);
    await campaigns.findByPublisher("pub-1");
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("LEFT JOIN app.campaign_publishers");
    expect(sql).toContain("c.publisher_id = $1 OR cp.publisher_id = $1");
    expect(params).toEqual(["pub-1"]);
  });

  it("findManyWithBid exposes effective price/payout (override wins) + soft-delete filter", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("COUNT(*)")) return [{ count: "2" }];
      return [
        { id: "c1", effective_price_cents: 1600, effective_payout_cents: 1000 },
        { id: "c2", effective_price_cents: 3500, effective_payout_cents: 2000 },
      ];
    });
    const { rows, total } = await campaigns.findManyWithBid({ limit: 25, offset: 0 });
    expect(total).toBe(2);
    expect(rows[0]).toMatchObject({ effective_price_cents: 1600 });
    const selectSql = queryMock.mock.calls[1]![0] as string;
    expect(selectSql).toContain("COALESCE(bo.price_cents,  c.price_cents)  AS effective_price_cents");
    expect(selectSql).toContain("COALESCE(bo.payout_cents, c.max_publisher_payout_cents) AS effective_payout_cents");
    expect(selectSql).toContain("c.deleted_at IS NULL");
    expect(selectSql).toContain("LEFT JOIN app.bid_overrides bo");
  });

  it("findManyWithBid allowlists sort columns (injection-safe) + binds search/limit", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("COUNT(*)")) return [{ count: "0" }];
      return [];
    });
    await campaigns.findManyWithBid({
      agencyId: "agency-1",
      status: "active",
      search: "Medicare",
      sortBy: "started_at;--",
      order: "asc",
      limit: 10,
      offset: 20,
    });
    const selectSql = queryMock.mock.calls[1]![0] as string;
    const selectParams = queryMock.mock.calls[1]![1] as unknown[];
    // malicious sort falls back to created_at, never interpolated raw
    expect(selectSql).toContain("ORDER BY c.created_at ASC");
    expect(selectSql).not.toContain("started_at;--");
    expect(selectSql).toContain("c.name ILIKE");
    expect(selectParams).toContain("agency-1");
    expect(selectParams).toContain("active");
    expect(selectParams).toContain("%Medicare%");
    expect(selectParams.slice(-2)).toEqual([10, 20]);
  });
});
