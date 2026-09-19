import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any[]>>();
const queryOneMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any>>();

vi.mock("@/server/db", () => ({
  query: (sql: string, params?: unknown[]) => queryMock(sql, params),
  queryOne: (sql: string, params?: unknown[]) => queryOneMock(sql, params),
}));

const { campaignCreatives, liveCreativeClause } = await import("./campaign-creatives");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("liveCreativeClause window (P2.1)", () => {
  it("enforces active + date window + not-deleted", () => {
    const clause = liveCreativeClause("cc");
    expect(clause).toContain("cc.deleted_at IS NULL");
    expect(clause).toContain("cc.active = true");
    expect(clause).toContain("cc.starts_at IS NULL OR cc.starts_at <= now()");
    expect(clause).toContain("cc.ends_at IS NULL OR cc.ends_at > now()");
  });

  it("supports a custom table alias", () => {
    expect(liveCreativeClause("x")).toContain("x.active = true");
  });
});

describe("campaignCreatives feed extended (P2.1 gaps)", () => {
  it("lists without placement (all placements) ordered by priority", async () => {
    queryMock.mockResolvedValueOnce([]);
    await campaignCreatives.listFeedForAgent("agency-1", ["camp-a"]);
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).not.toContain("cc.placement =");
    expect(sql).toContain("ORDER BY cc.priority DESC, cc.created_at DESC");
    expect(sql).toContain("cc.campaign_id = ANY(");
    expect(params).toEqual(["agency-1", ["camp-a"]]);
  });

  it("binds placement before the campaign scope array", async () => {
    queryMock.mockResolvedValueOnce([]);
    await campaignCreatives.listFeedForAgent("agency-1", ["camp-a"], "agent_hero");
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("cc.placement = $2");
    expect(sql).toContain("cc.campaign_id = ANY($3::uuid[])");
    expect(params).toEqual(["agency-1", "agent_hero", ["camp-a"]]);
  });

  it("listCreatives scopes to agency and skips deleted, priority first", async () => {
    queryMock.mockResolvedValueOnce([]);
    await campaignCreatives.listCreatives("agency-9");
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("agency_id = $1 AND deleted_at IS NULL");
    expect(sql).toContain("ORDER BY priority DESC");
    expect(params).toEqual(["agency-9"]);
  });

  it("updateCreative sets only provided fields + bumps updated_at", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "cc-1", title: "New" });
    const row = await campaignCreatives.updateCreative("cc-1", "agency-1", {
      title: "New",
      active: false,
    });
    expect(row).toMatchObject({ id: "cc-1" });
    const [sql, params] = queryOneMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("title = $3");
    expect(sql).toContain("active = $4");
    expect(sql).toContain("updated_at = now()");
    expect(sql).toContain("AND agency_id = $2 AND deleted_at IS NULL");
    expect(params).toEqual(["cc-1", "agency-1", "New", false]);
  });

  it("updateCreative ignores unknown keys (no mass-assignment)", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "cc-1" });
    await campaignCreatives.updateCreative("cc-1", "agency-1", {
      // @ts-expect-error — evil key must never reach SQL
      agency_id: "agency-evil",
      title: "Ok",
    });
    const [sql, params] = queryOneMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("title = $3");
    expect(sql).not.toContain("agency_id = $3");
    expect(params).toEqual(["cc-1", "agency-1", "Ok"]);
  });
});
