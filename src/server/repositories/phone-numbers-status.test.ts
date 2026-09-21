import { describe, it, expect, vi, beforeEach } from "vitest";

const queryOneMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any>>();

vi.mock("@/server/db", () => ({
  query: vi.fn().mockResolvedValue([]),
  queryOne: (sql: string, params?: unknown[]) => queryOneMock(sql, params),
}));

const { phoneNumbers } = await import("./phone-numbers");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("phone-numbers DID hardening (Phase 0.2)", () => {
  it("findByE164 only resolves active numbers", async () => {
    queryOneMock.mockResolvedValueOnce(null);
    await phoneNumbers.findByE164("+15559876543");
    const [sql, params] = queryOneMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("e164 = $1");
    expect(sql).toContain("status = 'active'");
    expect(params).toEqual(["+15559876543"]);
  });

  it("findByCampaign only resolves active numbers", async () => {
    queryOneMock.mockResolvedValueOnce(null);
    await phoneNumbers.findByCampaign("campaign-1");
    const [sql, params] = queryOneMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("campaign_id = $1");
    expect(sql).toContain("status = 'active'");
    expect(params).toEqual(["campaign-1"]);
  });
});
