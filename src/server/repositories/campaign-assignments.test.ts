import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.hoisted(() => vi.fn(async (sql: string, params?: unknown[]): Promise<unknown[]> => {
  if (sql.includes("JOIN app.agents")) return [{ agency_id: "agency-agent" }];
  if (sql.includes("SELECT DISTINCT agency_id FROM app.campaign_assignments")) return [];
  if (sql.includes("SELECT is_exclusive")) {
    return (params?.[0] === "camp-exclusive")
      ? [{ is_exclusive: true, visibility: "exclusive" }]
      : [{ is_exclusive: false, visibility: "default" }];
  }
  return [];
}));

vi.mock("@/server/db", () => ({
  query: queryMock,
  transaction: vi.fn(async (fn: (client: never) => Promise<unknown>) => fn({} as never)),
}));

const { findRoutableAgencyIds, findAgentAgencyIds } = await import("./campaign-assignments");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("findAgentAgencyIds", () => {
  it("resolves the agencies of agent-level assignments", async () => {
    await expect(findAgentAgencyIds("camp-1")).resolves.toEqual(["agency-agent"]);
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("JOIN app.agents");
    expect(params).toEqual(["camp-1"]);
  });
});

describe("findRoutableAgencyIds (agent-only assignment scope)", () => {
  it("widens the scope to assigned agents' agencies, not just the owner", async () => {
    // No agency-level rows (default mock), one agent-level row's agency.
    await expect(findRoutableAgencyIds("camp-1", "owner-agency")).resolves.toEqual(
      ["owner-agency", "agency-agent"],
    );
  });

  it("stays open (undefined) when nothing is assigned on a non-exclusive campaign", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT is_exclusive")) return [{ is_exclusive: false, visibility: "default" }];
      return [];
    });
    await expect(findRoutableAgencyIds("camp-1", "owner-agency")).resolves.toBeUndefined();
  });

  it("restricts to the owner for exclusive campaigns with no assignments", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT is_exclusive")) return [{ is_exclusive: true, visibility: "exclusive" }];
      return [];
    });
    await expect(findRoutableAgencyIds("camp-exclusive", "owner-agency")).resolves.toEqual(["owner-agency"]);
  });
});
