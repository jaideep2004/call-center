import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any[]>>();
const queryOneMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any>>();

vi.mock("@/server/db", () => ({
  query: (sql: string, params?: unknown[]) => queryMock(sql, params),
  queryOne: (sql: string, params?: unknown[]) => queryOneMock(sql, params),
}));

const { campaignCreatives } = await import("./campaign-creatives");

const INPUT = {
  agency_id: "agency-1",
  campaign_id: null,
  type: "image" as const,
  title: "Spring push",
  media_url: "https://cdn/x.png",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("campaignCreatives repo (P2.1)", () => {
  it("creates global creatives with feed defaults", async () => {
    queryMock.mockResolvedValueOnce([{ id: "cc-1", ...INPUT }]);
    const row = await campaignCreatives.createCreative(INPUT);
    expect(row.id).toBe("cc-1");
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("INSERT INTO app.campaign_creatives");
    expect(params).toContain("agent_feed");
    expect(params).toContain(0);
  });

  it("shows globals to unassigned agents, scopes linked rows to assignments", async () => {
    queryMock.mockResolvedValueOnce([]);
    await campaignCreatives.listFeedForAgent("agency-1", [], "agent_feed");
    let [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("cc.campaign_id IS NULL");
    expect(sql).toContain("active = true");

    queryMock.mockResolvedValueOnce([]);
    await campaignCreatives.listFeedForAgent("agency-1", ["camp-a", "camp-b"]);
    [sql, params] = queryMock.mock.calls[1] as [string, unknown[]];
    expect(sql).toContain("cc.campaign_id = ANY(");
    expect(params).toContainEqual(["camp-a", "camp-b"]);
  });

  it("update with no fields returns the scoped row", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "cc-1" });
    const row = await campaignCreatives.updateCreative("cc-1", "agency-1", {});
    expect(row).toMatchObject({ id: "cc-1" });
    const [sql] = queryOneMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("SELECT *");
  });

  it("soft-deletes within the agency scope", async () => {
    queryMock.mockResolvedValueOnce([]);
    await campaignCreatives.softDeleteCreative("cc-1", "agency-1");
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("deleted_at = now()");
    expect(params).toEqual(["cc-1", "agency-1"]);
  });
});
