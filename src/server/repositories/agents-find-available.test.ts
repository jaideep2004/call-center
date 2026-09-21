import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any[]>>();

vi.mock("@/server/db", () => ({
  query: (sql: string, params?: unknown[]) => queryMock(sql, params),
  queryOne: vi.fn().mockResolvedValue(null),
}));

const { agents } = await import("./agents");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("agents.findAvailable routing gate (Phase 1.2)", () => {
  it("excludes soft-deleted agents so the partial index actually applies", async () => {
    queryMock.mockResolvedValueOnce([]);
    await agents.findAvailable("agency-1");
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("a.deleted_at IS NULL");
    expect(sql).toContain("a.approval_status = 'approved'");
    expect(params).toEqual(["agency-1"]);
  });
});
