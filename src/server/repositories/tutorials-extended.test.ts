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

describe("tutorials repo extended (P2.2 gaps)", () => {
  it("recordProgress reset=true overwrites instead of monotonic merge", async () => {
    queryMock.mockResolvedValueOnce([{ tutorial_id: "t-1", watched_percent: 10, completed: false }]);
    await tutorials.recordProgress("t-1", "user-1", {
      watched_seconds: 5,
      watched_percent: 10,
      reset: true,
    });
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("CASE WHEN $6 THEN EXCLUDED.watched_percent");
    expect(params?.[params.length - 1]).toBe(true);
  });

  it("recordProgress clamps negative seconds to 0 and rounds percent", async () => {
    queryMock.mockResolvedValueOnce([{ tutorial_id: "t-1", completed: true }]);
    const row = await tutorials.recordProgress("t-1", "user-1", {
      watched_seconds: -12.4,
      watched_percent: 89.6,
    });
    // Math.round(89.6) = 90 -> completed flips true; seconds Math.max(0, round(-12.4)) = 0
    expect(row.completed).toBe(true);
    const [, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(params).toEqual(["t-1", "user-1", 0, 90, true, false]);
  });

  it("recordProgress 89.4% stays incomplete, 90% flips completed", async () => {
    queryMock.mockResolvedValueOnce([{ completed: false }]);
    const below = await tutorials.recordProgress("t-1", "u", { watched_seconds: 80, watched_percent: 89.4 });
    expect(below.completed).toBe(false);
    const [, paramsBelow] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(paramsBelow?.[3]).toBe(89);

    queryMock.mockResolvedValueOnce([{ completed: true }]);
    const at = await tutorials.recordProgress("t-1", "u", { watched_seconds: 81, watched_percent: 90 });
    expect(at.completed).toBe(true);
    const [, paramsAt] = queryMock.mock.calls[1] as [string, unknown[]];
    expect(paramsAt?.[3]).toBe(90);
  });

  it("progressFor scopes to the (tutorial, user) pair", async () => {
    queryOneMock.mockResolvedValueOnce(null);
    await tutorials.progressFor("t-9", "user-9");
    const [sql, params] = queryOneMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("FROM app.tutorial_progress");
    expect(sql).toContain("tutorial_id = $1 AND user_id = $2");
    expect(params).toEqual(["t-9", "user-9"]);
  });

  it("findByAgency scopes to agency and sorts newest first", async () => {
    queryOneMock.mockResolvedValueOnce({ count: "2" });
    queryMock.mockResolvedValueOnce([]);
    const rows = await tutorials.findByAgency("agency-7");
    expect(rows).toEqual([]);
    const countSql = queryOneMock.mock.calls[0]![0] as string;
    const countParams = queryOneMock.mock.calls[0]![1] as unknown[];
    expect(countSql).toContain("FROM app.tutorials");
    expect(countSql).toContain("agency_id = $1");
    expect(countParams).toEqual(["agency-7"]);
    const [rowsSql] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(rowsSql.toLowerCase()).toContain("order by created_at desc");
  });

  it("findPublished excludes soft-deleted rows", async () => {
    queryMock.mockResolvedValueOnce([]);
    await tutorials.findPublished("agency-1");
    const [sql] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("deleted_at IS NULL");
    expect(sql).toContain("published = true");
  });
});
