import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any[]>>();
const queryOneMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any>>();

vi.mock("@/server/db", () => ({
  query: (sql: string, params?: unknown[]) => queryMock(sql, params),
  queryOne: (sql: string, params?: unknown[]) => queryOneMock(sql, params),
}));

const { notifications } = await import("./notifications");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("notifications viewer scoping", () => {
  it("findForViewer as admin reads every row (no agency filter)", async () => {
    queryMock.mockResolvedValueOnce([]);
    await notifications.findForViewer(50, "agency-1", true);
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).not.toContain("agency_id");
    expect(params).toEqual([50]);
  });

  it("findForViewer as agent includes own agency plus global rows, addressed to self or broadcast", async () => {
    queryMock.mockResolvedValueOnce([]);
    await notifications.findForViewer(50, "agency-1", false, "u-1");
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("agency_id = $1 OR agency_id IS NULL");
    expect(sql).toContain("payload->>'userId'");
    expect(params).toEqual(["agency-1", 50, "u-1"]);
  });

  it("findForViewer hides rows addressed to other users", async () => {
    queryMock.mockResolvedValueOnce([]);
    await notifications.findForViewer(50, "agency-1", false, "u-1");
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("payload->>'userId' IS NULL OR payload->>'userId' = $3");
    expect(params).toEqual(["agency-1", 50, "u-1"]);
  });

  it("findForViewer without an agency only sees global rows", async () => {
    queryMock.mockResolvedValueOnce([]);
    await notifications.findForViewer(50, null, false);
    const [sql] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("agency_id IS NULL");
  });

  it("markDispatchedScoped as agent cannot touch other-agency rows", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "n-1" });
    await notifications.markDispatchedScoped("n-1", "agency-1", false, "u-1");
    const [sql, params] = queryOneMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("(agency_id = $2 OR agency_id IS NULL)");
    expect(sql).toContain("payload->>'userId'");
    expect(params).toEqual(["n-1", "agency-1", "u-1"]);
  });

  it("markDispatchedScoped cannot mark rows addressed to another user", async () => {
    queryOneMock.mockResolvedValueOnce(null);
    await expect(
      notifications.markDispatchedScoped("n-2", "agency-1", false, "u-1"),
    ).resolves.toBeNull();
    const [sql] = queryOneMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("payload->>'userId' = $3");
  });

  it("markDispatchedScoped returns null when the row is invisible (404 path)", async () => {
    queryOneMock.mockResolvedValueOnce(null);
    await expect(notifications.markDispatchedScoped("ghost", "agency-1", false)).resolves.toBeNull();
  });

  it("markAllDispatchedScoped as admin flips every unread row and reports the count", async () => {
    queryMock.mockResolvedValueOnce([{ id: "a" }, { id: "b" }]);
    await expect(notifications.markAllDispatchedScoped("agency-1", true)).resolves.toBe(2);
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("dispatched_at IS NULL");
    expect(sql).not.toContain("agency_id");
    expect(params ?? []).toEqual([]);
  });

  it("markAllDispatchedScoped as agent stays inside its agency plus global, minus others' rows", async () => {
    queryMock.mockResolvedValueOnce([{ id: "a" }]);
    await expect(notifications.markAllDispatchedScoped("agency-1", false, "u-1")).resolves.toBe(1);
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("(agency_id = $1 OR agency_id IS NULL)");
    expect(sql).toContain("payload->>'userId'");
    expect(params).toEqual(["agency-1", "u-1"]);
  });
});
