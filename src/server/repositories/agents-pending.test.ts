import { describe, it, expect, vi, beforeEach } from "vitest";

const queryOneMock = vi.hoisted(() => vi.fn());
const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  queryOne: queryOneMock,
  query: queryMock,
  transaction: vi.fn(),
}));

const { agents } = await import("./agents");

beforeEach(() => {
  vi.clearAllMocks();
  queryOneMock.mockResolvedValue(null);
  queryMock.mockResolvedValue([]);
});

describe("agents pending-signup support (0066)", () => {
  it("findMany uses LEFT JOINs so membership-less rows list", async () => {
    queryOneMock.mockResolvedValue({ count: "1" });
    queryMock.mockResolvedValue([{ id: "a-pending" }]);
    await agents.findMany({ pagination: { page: 1, limit: 10 } });
    const [countSql] = queryOneMock.mock.calls[0] as unknown as [string];
    expect(countSql).toContain("LEFT JOIN app.memberships");
    expect(countSql).toContain('LEFT JOIN "user"');
    const [listSql] = queryMock.mock.calls[0] as unknown as [string];
    expect(listSql).toContain("COALESCE(u.name, u2.name");
  });

  it("findByUserId resolves pending rows by login identity", async () => {
    queryOneMock.mockResolvedValue({ id: "a-pending" });
    const row = await agents.findByUserId("u-9");
    expect(row).toMatchObject({ id: "a-pending" });
    const [sql, params] = queryOneMock.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("user_id = $1");
    expect(params).toEqual(["u-9"]);
  });

  it("adoptOrCreate adopts a pending signup row into the new membership", async () => {
    queryOneMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "a-pending" })
      .mockResolvedValueOnce({ id: "a-pending", agency_id: "agency-1", membership_id: "m-1" });
    const res = await agents.adoptOrCreate({ agency_id: "agency-1", membership_id: "m-1", user_id: "u-9" });
    expect(res.adopted).toBe(true);
    expect(res.agent).toMatchObject({ id: "a-pending" });
  });

  it("adoptOrCreate returns the existing membership row untouched", async () => {
    queryOneMock.mockResolvedValue({ id: "a-1" });
    const res = await agents.adoptOrCreate({ agency_id: "agency-1", membership_id: "m-1", user_id: "u-9" });
    expect(res).toMatchObject({ adopted: false, agent: { id: "a-1" } });
  });
});
