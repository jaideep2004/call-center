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

describe("getEligibleOffers extra (publisher + campaigns gaps)", () => {
  it("rejects payouts below the publisher min", async () => {
    offerRows = [offer({ campaign_id: "camp-low", max_publisher_payout_cents: 500 })];
    agentByCampaign = { "camp-low": "agent-1" };
    const result = await getEligibleOffers({
      publisher_campaign_id: "camp-pub",
      caller_state: "TX",
      publisher_payout_min_cents: 1000,
    });
    expect(result.eligible).toEqual([]);
    expect(result.rejected["camp-low"]).toContain("payout_below_min");
  });

  it("payout override wins the range check", async () => {
    offerRows = [
      offer({ campaign_id: "camp-ov", max_publisher_payout_cents: 2500, override_payout_cents: 1500 }),
    ];
    agentByCampaign = { "camp-ov": "agent-1" };
    const result = await getEligibleOffers({
      publisher_campaign_id: "camp-pub",
      caller_state: "TX",
      publisher_payout_max_cents: 1800,
    });
    expect(result.eligible.map((e) => e.campaign_id)).toEqual(["camp-ov"]);
    expect(result.eligible[0]!.payout_cents).toBe(1500);
  });

  it("explicit caller_state beats NPA-derived state", async () => {
    offerRows = [offer({ campaign_id: "camp-fl", target_states: ["FL"] })];
    agentByCampaign = { "camp-fl": "agent-1" };
    // +1214... is TX by NPA, but the explicit override says FL
    const result = await getEligibleOffers({
      publisher_campaign_id: "camp-pub",
      caller_number: "+12145551234",
      caller_state: "FL",
    });
    expect(result.caller_state).toBe("FL");
    expect(result.eligible.map((e) => e.campaign_id)).toEqual(["camp-fl"]);
  });

  it("falls back buffer -> min_connected -> 30s", async () => {
    offerRows = [
      offer({ campaign_id: "camp-buf", buffer_seconds: null, min_connected_seconds: 90 }),
      offer({ campaign_id: "camp-def", buffer_seconds: null, min_connected_seconds: null }),
    ];
    agentByCampaign = { "camp-buf": "a1", "camp-def": "a2" };
    const result = await getEligibleOffers({ publisher_campaign_id: "camp-pub", caller_state: "TX" });
    const byId = new Map(result.eligible.map((e) => [e.campaign_id, e.buffer_seconds]));
    expect(byId.get("camp-buf")).toBe(90);
    expect(byId.get("camp-def")).toBe(30);
  });
});
