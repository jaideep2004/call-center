import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  query: queryMock,
  queryOne: vi.fn(),
  transaction: vi.fn(),
  pool: { query: queryMock },
}));

const { syncRecordingsFromRetreaver, linkRecordingForCall } = await import("./retreaver-recordings");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("syncRecordingsFromRetreaver", () => {
  it("bridges linked Retreaver recording URLs into app.recordings", async () => {
    queryMock.mockResolvedValue([{ id: "r1" }, { id: "r2" }, { id: "r3" }]);
    const res = await syncRecordingsFromRetreaver("agency-1");
    expect(res).toEqual({ synced: 3 });
    const [sql, params] = queryMock.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("app.retreaver_calls");
    expect(sql).toContain("ON CONFLICT DO NOTHING");
    expect(params).toEqual(["agency-1"]);
  });

  it("syncs platform-wide for admins (no agency scope)", async () => {
    queryMock.mockResolvedValue([]);
    const res = await syncRecordingsFromRetreaver(undefined);
    expect(res).toEqual({ synced: 0 });
    const [, params] = queryMock.mock.calls[0] as unknown as [string, unknown[]];
    expect(params).toEqual([]);
  });

  it("links a single call opportunistically", async () => {
    queryMock.mockResolvedValue([{ id: "r1" }]);
    await expect(linkRecordingForCall("call-1")).resolves.toBe(true);
  });

  it("never throws (stats must not break linking)", async () => {
    queryMock.mockRejectedValueOnce(new Error("db down"));
    await expect(linkRecordingForCall("call-1")).resolves.toBe(false);
  });
});
