import { describe, it, expect, vi, beforeEach } from "vitest";

const queryOneMock = vi.fn<(sql: string, params?: unknown[]) => any>();
const queryMock = vi.fn<(sql: string, params?: unknown[]) => any>(async () => [
  { npa: "305", state: "FL" },
  { npa: "312", state: "IL" },
  { npa: "214", state: "TX" },
]);

vi.mock("@/server/db", () => ({
  queryOne: (sql: string, params?: unknown[]) => queryOneMock(sql, params),
  query: (sql: string, params?: unknown[]) => queryMock(sql, params),
}));

const { evaluatePing, callerStateFromNumber, resolveNpaState } = await import("./ping-evaluator");

const activeCampaign = {
  campaign_id: "camp-1",
  agency_id: "agency-1",
  status: "active",
  target_states: ["IL", "TX"],
};

describe("callerStateFromNumber", () => {
  it("extracts NPA from US numbers", () => {
    expect(callerStateFromNumber("+13125551234")).toBe("312");
    expect(callerStateFromNumber("+12145551234")).toBe("214");
    expect(callerStateFromNumber("(847) 555-1234")).toBe("847");
  });

  it("returns null for unparseable / international numbers", () => {
    expect(callerStateFromNumber(null)).toBeNull();
    expect(callerStateFromNumber("+442071234567")).toBeNull();
    expect(callerStateFromNumber("anonymous")).toBeNull();
  });
});

describe("evaluatePing", () => {
  beforeEach(() => {
    queryOneMock.mockReset();
  });

  it("rejects unknown DID with unknown_campaign", async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const result = await evaluatePing({ did: "+15550000000", caller: "+13125551234" });
    expect(result).toEqual({ decision: "reject", reason: "unknown_campaign", state: null, campaignId: null });
  });

  it("rejects paused campaign with campaign_paused", async () => {
    queryOneMock.mockResolvedValueOnce({ ...activeCampaign, status: "paused" });
    const result = await evaluatePing({ did: "+15550000000", caller: "+13125551234" });
    expect(result.decision).toBe("reject");
    if (result.decision === "reject") expect(result.reason).toBe("campaign_paused");
  });

  it("rejects state mismatch with state_mismatch + caller state", async () => {
    queryOneMock.mockResolvedValueOnce(activeCampaign);
    const result = await evaluatePing({ did: "+15550000000", caller: "+13055551234" });
    expect(result).toMatchObject({ decision: "reject", reason: "state_mismatch", state: "FL" });
    expect(queryOneMock).toHaveBeenCalledTimes(1); // no agent query runs
  });

  it("rejects when caller state is unknowable and campaign restricts states", async () => {
    queryOneMock.mockResolvedValueOnce(activeCampaign);
    const result = await evaluatePing({ did: "+15550000000", caller: "anonymous" });
    expect(result.decision).toBe("reject");
    if (result.decision === "reject") expect(result.reason).toBe("state_mismatch");
  });

  it("rejects with no_agent_available when no matching agent", async () => {
    queryOneMock
      .mockResolvedValueOnce(activeCampaign)
      .mockResolvedValueOnce(null);
    const result = await evaluatePing({ did: "+15550000000", caller: "+13125551234" });
    expect(result).toMatchObject({ decision: "reject", reason: "no_agent_available", state: "IL" });
  });

  it("accepts when state matches and an agent is available", async () => {
    queryOneMock
      .mockResolvedValueOnce(activeCampaign)
      .mockResolvedValueOnce({ id: "agent-9" });
    const result = await evaluatePing({ did: "+15550000000", caller: "+13125551234" });
    expect(result).toEqual({
      decision: "accept",
      state: "IL",
      campaignId: "camp-1",
      agencyId: "agency-1",
      agentId: "agent-9",
    });
  });

  it("accepts any state when campaign has no state restriction", async () => {
    queryOneMock
      .mockResolvedValueOnce({ ...activeCampaign, campaign_id: "camp-2", target_states: [] })
      .mockResolvedValueOnce({ id: "agent-5" });
    const result = await evaluatePing({ did: "+15550000001", caller: "anonymous" });
    expect(result.decision).toBe("accept");
  });
});

describe("resolveNpaState", () => {
  it("serves from the in-memory cache", async () => {
    expect(await resolveNpaState("312")).toBe("IL");
    expect(await resolveNpaState("305")).toBe("FL");
    expect(await resolveNpaState("000")).toBeNull();
  });
});
