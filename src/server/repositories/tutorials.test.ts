import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any[]>>();
const queryOneMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any>>();

vi.mock("@/server/db", () => ({
  query: (sql: string, params?: unknown[]) => queryMock(sql, params),
  queryOne: (sql: string, params?: unknown[]) => queryOneMock(sql, params),
}));

const { tutorials } = await import("./tutorials");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tutorials progress (P2.2)", () => {
  it("findPublished orders by manual order, published only", async () => {
    queryMock.mockResolvedValueOnce([]);
    await tutorials.findPublished("agency-1");
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("published = true");
    expect(sql).toContain("ORDER BY order_index ASC");
    expect(params).toEqual(["agency-1"]);
  });

  it("joins viewer progress in one query (no N+1)", async () => {
    queryMock.mockResolvedValueOnce([]);
    await tutorials.findPublishedWithProgress("agency-1", "user-1");
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("LEFT JOIN app.tutorial_progress");
    expect(sql).toContain("tp.user_id = $2");
    expect(params).toEqual(["agency-1", "user-1"]);
  });

  it("flips completed at 90% and clamps inputs", async () => {
    queryMock.mockResolvedValueOnce([{ tutorial_id: "t-1", completed: true }]);
    const row = await tutorials.recordProgress("t-1", "user-1", { watched_seconds: 95.6, watched_percent: 132 });
    expect(row.completed).toBe(true);
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("ON CONFLICT (tutorial_id, user_id)");
    expect(sql).toContain("GREATEST(");
    // seconds rounded, percent clamped to 100, completed derived server-side
    expect(params).toEqual(["t-1", "user-1", 96, 100, true, false]);
  });

  it("keeps progress monotonic (never moves backward without reset)", async () => {
    queryMock.mockResolvedValueOnce([{ tutorial_id: "t-1", completed: false }]);
    await tutorials.recordProgress("t-1", "user-1", { watched_seconds: 10, watched_percent: 20 });
    const [sql] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("OR EXCLUDED.completed");
  });
});
