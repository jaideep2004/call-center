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

describe("agent presence heartbeat", () => {
  it("touchPresence refreshes only an available row, scoped by membership", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "ag-1" });
    await expect(agents.touchPresence("mem-1")).resolves.toBe(true);
    const [sql, params] = queryOneMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("presence_seen_at = now()");
    expect(sql).toContain("availability = 'available'");
    expect(sql).toContain("membership_id = $1");
    expect(params).toEqual(["mem-1"]);
  });

  it("touchPresence reports offline when no available row matched", async () => {
    queryOneMock.mockResolvedValueOnce(null);
    await expect(agents.touchPresence("mem-1")).resolves.toBe(false);
  });

  it("going offline clears the presence stamp", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "ag-1", availability: "offline" });
    await agents.updateAvailability("ag-1", "offline", "agency-1");
    const [sql, params] = queryOneMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("presence_seen_at = $3");
    expect(params).toEqual(["ag-1", "offline", null, "agency-1"]);
  });

  it("routing only considers fresh presence stamps", async () => {
    queryMock.mockResolvedValueOnce([]);
    await agents.findAvailable("agency-1");
    const [sql] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("a.presence_seen_at > now() - interval '180 seconds'");
  });
});
