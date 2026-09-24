import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyWithBidMock = vi.hoisted(() => vi.fn());
const findByMembershipIdMock = vi.hoisted(() => vi.fn());
const dbQueryMock = vi.hoisted(() => vi.fn(async (): Promise<Array<{ campaign_id: string; agency_id: string | null; agent_id: string | null }>> => []));
const findIdsForAgencyOrAgentMock = vi.hoisted(() => vi.fn(async () => []));
const findAllAssignedMock = vi.hoisted(() => vi.fn(async () => []));

vi.mock("@/server/repositories", () => ({
  campaigns: { findManyWithBid: findManyWithBidMock },
  agents: { findByMembershipId: findByMembershipIdMock },
  campaignAssignments: {
    findCampaignIdsForAgencyOrAgent: findIdsForAgencyOrAgentMock,
    findAllAssignedCampaignIds: findAllAssignedMock,
  },
}));

vi.mock("@/server/db", () => ({
  query: dbQueryMock,
}));

let routeCtx: {
  user: { id: string; role: string };
  agencyId: string | null;
  membership: { id: string } | undefined;
};

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, { ...(ctx as object), ...routeCtx });
        } catch (e: unknown) {
          const err = e as { message?: string; status?: number };
          return actual.fail(err.message ?? "Internal server error", err.status ?? 500);
        }
      };
    },
  };
});

const agentRoute = await import("@/app/api/v1/agent/campaigns/route");
const campaignsRoute = await import("@/app/api/v1/campaigns/route");

const ctx = { params: Promise.resolve({}) };

const bidRow = {
  id: "camp-1",
  agency_id: "agency-1",
  name: "FE Short",
  status: "active",
  price_cents: 5000,
  allowed_endpoints: ["webrtc"],
  target_states: [],
  max_publisher_payout_cents: 3500,
  min_publisher_payout_cents: 2500,
  effective_price_cents: 5000,
  effective_payout_cents: 3500,
  effective_max_payout_cents: 3500,
  has_bid_override: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  findManyWithBidMock.mockResolvedValue({ rows: [{ ...bidRow }], total: 1 });
  findByMembershipIdMock.mockResolvedValue({ id: "agent-1", agency_id: "agency-1" });
  dbQueryMock.mockResolvedValue([]);
  findIdsForAgencyOrAgentMock.mockResolvedValue([]);
  findAllAssignedMock.mockResolvedValue([]);
  routeCtx = {
    user: { id: "u-1", role: "agent" },
    agencyId: "agency-1",
    membership: { id: "m-1" },
  };
});

describe("payout strip for non-admins (Phase 4, point 2)", () => {
  it("agent browse hides every payout field", async () => {
    const res = await agentRoute.GET(
      new Request("http://x/api/v1/agent/campaigns?status=active"),
      ctx,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    expect(body.data).toHaveLength(1);
    const row = body.data[0];
    expect(row.effective_price_cents).toBe(5000);
    for (const k of [
      "effective_payout_cents",
      "effective_max_payout_cents",
      "max_publisher_payout_cents",
      "min_publisher_payout_cents",
    ]) {
      expect(row[k]).toBeUndefined();
    }
  });

  it("generic campaigns endpoint strips for agents but keeps for admins", async () => {
    const agentRes = await campaignsRoute.GET(
      new Request("http://x/api/v1/campaigns?status=active"),
      ctx,
    );
    const agentBody = (await agentRes.json()) as { data: Record<string, unknown>[] };
    expect(agentBody.data[0].effective_payout_cents).toBeUndefined();
    expect(agentBody.data[0].max_publisher_payout_cents).toBeUndefined();

    routeCtx = { user: { id: "u-admin", role: "admin" }, agencyId: null, membership: undefined };
    findManyWithBidMock.mockResolvedValue({ rows: [{ ...bidRow }], total: 1 });
    const adminRes = await campaignsRoute.GET(
      new Request("http://x/api/v1/campaigns?status=active"),
      ctx,
    );
    const adminBody = (await adminRes.json()) as { data: Record<string, unknown>[] };
    expect(adminBody.data[0].effective_payout_cents).toBe(3500);
  });
});

describe("exclusive visibility (client feedback 5)", () => {
  function get(url: string) {
    return agentRoute.GET(new Request(`http://x${url}`), ctx);
  }

  it("hides unassigned exclusive campaigns from browse", async () => {
    findManyWithBidMock.mockResolvedValue({
      rows: [
        { ...bidRow, id: "camp-open", is_exclusive: false, visibility: "default" },
        { ...bidRow, id: "camp-vip", is_exclusive: true, visibility: "exclusive" },
      ],
      total: 2,
    });
    const res = await get("/api/v1/agent/campaigns?status=active");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string }[] };
    expect(body.data.map((r) => r.id)).toEqual(["camp-open"]);
  });

  it("shows exclusive campaigns assigned to the viewer's agency", async () => {
    findManyWithBidMock.mockResolvedValue({
      rows: [{ ...bidRow, id: "camp-vip", is_exclusive: true, visibility: "exclusive" }],
      total: 1,
    });
    dbQueryMock.mockResolvedValue([{ campaign_id: "camp-vip", agency_id: "agency-1", agent_id: null }]);
    const res = await get("/api/v1/agent/campaigns?status=active");
    const body = (await res.json()) as { data: { id: string; assignment_status: string }[] };
    expect(body.data.map((r) => r.id)).toEqual(["camp-vip"]);
    expect(body.data[0].assignment_status).toBe("Assigned");
  });
});
