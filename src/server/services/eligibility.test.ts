import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any[]>>();
const queryOneMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any>>();

vi.mock("@/server/db", () => ({
  query: (sql: string, params?: unknown[]) => queryMock(sql, params),
  queryOne: (sql: string, params?: unknown[]) => queryOneMock(sql, params),
}));

const { getEligibleOffers } = await import("./eligibility");

const NPA_ROWS = [
  { npa: "214", state: "TX" },
  { npa: "312", state: "IL" },
  { npa: "305", state: "FL" },
];

function offer(overrides: Record<string, unknown> = {}) {
  return {
    campaign_id: "camp-x",
    agency_id: "agency-1",
    name: "Offer X",
    target_states: [],
    price_cents: 3000,
    max_publisher_payout_cents: 1500,
    buffer_seconds: 30,
    min_connected_seconds: 60,
    override_price_cents: null,
    override_payout_cents: null,
    ...overrides,
  };
}

const PUB = { id: "camp-pub", status: "active", rtb_enabled: true };

// Mutable fixtures per test. Agent gate: campaign id -> agent id (absent = none).
let offerRows: ReturnType<typeof offer>[] = [];
let agentByCampaign: Record<string, string> = {};

beforeEach(() => {
  vi.clearAllMocks();
  offerRows = [];
  agentByCampaign = {};
  queryMock.mockImplementation(async (sql: string) => {
    if (sql.includes("npa_states")) return NPA_ROWS;
    if (sql.includes("FROM app.campaigns")) return offerRows;
    return [];
  });
  queryOneMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
    if (sql.includes("SELECT id, status, rtb_enabled")) return PUB;
    if (sql.includes("FROM app.agents")) {
      const cid = params[params.length - 1] as string;
      return agentByCampaign[cid] ? { id: agentByCampaign[cid] } : null;
    }
    return null;
  });
});

describe("getEligibleOffers — payout range + margin (P1.3)", () => {
  it("excludes Buyer C above the publisher max while A/B stay eligible", async () => {
    offerRows = [
      offer({ campaign_id: "camp-a", name: "Buyer A", target_states: ["TX", "FL"], price_cents: 3500, max_publisher_payout_cents: 1700 }),
      offer({ campaign_id: "camp-b", name: "Buyer B", price_cents: 3000, max_publisher_payout_cents: 1800 }),
      offer({ campaign_id: "camp-c", name: "Buyer C", price_cents: 3000, max_publisher_payout_cents: 2200 }),
    ];
    agentByCampaign = { "camp-a": "agent-1", "camp-b": "agent-2", "camp-c": "agent-3" };
    const result = await getEligibleOffers({
      publisher_campaign_id: "camp-pub",
      caller_state: "TX",
      publisher_payout_min_cents: 1000,
      publisher_payout_max_cents: 1800,
    });
    expect(result.eligible.map((e) => e.campaign_id).sort()).toEqual(["camp-a", "camp-b"]);
    expect(result.rejected["camp-c"]).toContain("payout_above_max");
  });

  it("blocks negative margin (bid below payout)", async () => {
    offerRows = [offer({ campaign_id: "camp-d", price_cents: 1500, max_publisher_payout_cents: 2000 })];
    agentByCampaign = { "camp-d": "agent-1" };
    const result = await getEligibleOffers({ publisher_campaign_id: "camp-pub", caller_state: "TX" });
    expect(result.eligible).toEqual([]);
    expect(result.rejected["camp-d"]).toContain("negative_margin");
  });

  it("rejects unconfigured bid/payout explicitly", async () => {
    offerRows = [offer({ campaign_id: "camp-e", price_cents: null, max_publisher_payout_cents: null })];
    const result = await getEligibleOffers({ publisher_campaign_id: "camp-pub", caller_state: "TX" });
    expect(result.eligible).toEqual([]);
    expect(result.rejected["camp-e"]).toEqual(
      expect.arrayContaining(["bid_not_configured", "payout_not_configured"]),
    );
  });

  it("bid override wins for margin math", async () => {
    offerRows = [
      offer({ campaign_id: "camp-f", price_cents: 1500, max_publisher_payout_cents: 2000, override_price_cents: 2500 }),
    ];
    agentByCampaign = { "camp-f": "agent-1" };
    const result = await getEligibleOffers({ publisher_campaign_id: "camp-pub", caller_state: "TX" });
    expect(result.eligible.map((e) => e.campaign_id)).toEqual(["camp-f"]);
    expect(result.eligible[0]!.bid_cents).toBe(2500);
  });
});

describe("getEligibleOffers — state match (P1.3)", () => {
  it("TX caller passes TX/FL offers, drops FL-only offers", async () => {
    offerRows = [
      offer({ campaign_id: "camp-a", target_states: ["TX", "FL"] }),
      offer({ campaign_id: "camp-e", target_states: ["FL"] }),
    ];
    agentByCampaign = { "camp-a": "agent-1", "camp-e": "agent-2" };
    const result = await getEligibleOffers({ publisher_campaign_id: "camp-pub", caller_state: "TX" });
    expect(result.eligible.map((e) => e.campaign_id)).toEqual(["camp-a"]);
    expect(result.rejected["camp-e"]).toContain("state_mismatch");
  });

  it("derives caller state from NPA when only caller_number is given", async () => {
    offerRows = [offer({ campaign_id: "camp-a", target_states: ["TX"] })];
    agentByCampaign = { "camp-a": "agent-1" };
    const result = await getEligibleOffers({ publisher_campaign_id: "camp-pub", caller_number: "+12145551234" });
    expect(result.caller_state).toBe("TX");
    expect(result.eligible.map((e) => e.campaign_id)).toEqual(["camp-a"]);
  });

  it("accepts unrestricted offers for anonymous callers", async () => {
    offerRows = [offer({ campaign_id: "camp-b", target_states: [] })];
    agentByCampaign = { "camp-b": "agent-2" };
    const result = await getEligibleOffers({ publisher_campaign_id: "camp-pub", caller_number: "anonymous" });
    expect(result.caller_state).toBeNull();
    expect(result.eligible.map((e) => e.campaign_id)).toEqual(["camp-b"]);
  });
});

describe("getEligibleOffers — agent gate + publisher validation (P1.3)", () => {
  it("excludes depleted buyers with no routable agent", async () => {
    offerRows = [offer({ campaign_id: "camp-f" })];
    agentByCampaign = {}; // nobody live/funded for camp-f
    const result = await getEligibleOffers({ publisher_campaign_id: "camp-pub", caller_state: "TX" });
    expect(result.eligible).toEqual([]);
    expect(result.rejected["camp-f"]).toContain("no_routable_agent");
  });

  it("returns an empty pool (no-target shape) when every offer is rejected", async () => {
    offerRows = [offer({ campaign_id: "camp-c", max_publisher_payout_cents: 2200 })];
    const result = await getEligibleOffers({
      publisher_campaign_id: "camp-pub",
      caller_state: "TX",
      publisher_payout_max_cents: 1800,
    });
    expect(result.eligible).toEqual([]);
    expect(Object.keys(result.rejected)).toEqual(["camp-c"]);
  });

  it("is a pure read: repeat pings return identical results", async () => {
    offerRows = [offer({ campaign_id: "camp-a" })];
    agentByCampaign = { "camp-a": "agent-1" };
    const input = { publisher_campaign_id: "camp-pub", caller_state: "TX" };
    const first = await getEligibleOffers(input);
    const second = await getEligibleOffers(input);
    expect(second).toEqual(first);
  });

  it("excludes exclusive offers from the open pool at the query level", async () => {
    offerRows = [offer({ campaign_id: "camp-a" })];
    agentByCampaign = { "camp-a": "agent-1" };
    await getEligibleOffers({ publisher_campaign_id: "camp-pub", caller_state: "TX" });
    const offersQuery = queryMock.mock.calls.find(
      (call) => typeof call[0] === "string" && call[0].includes("FROM app.campaigns"),
    );
    expect(offersQuery).toBeDefined();
    expect(offersQuery![0] as string).toContain("is_exclusive");
    expect(offersQuery![0] as string).toContain("visibility");
  });

  it("rejects unknown publisher campaigns", async () => {
    queryOneMock.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT id, status, rtb_enabled")) return null;
      return null;
    });
    await expect(getEligibleOffers({ publisher_campaign_id: "camp-missing" })).rejects.toThrow(
      "Publisher campaign not found",
    );
  });

  it("rejects paused or non-RTB publisher campaigns", async () => {
    queryOneMock.mockImplementationOnce(async () => ({ ...PUB, status: "paused" }));
    await expect(getEligibleOffers({ publisher_campaign_id: "camp-pub" })).rejects.toThrow("not active");
    queryOneMock.mockImplementationOnce(async () => ({ ...PUB, rtb_enabled: false }));
    await expect(getEligibleOffers({ publisher_campaign_id: "camp-pub" })).rejects.toThrow("not RTB-enabled");
  });
});
