import { describe, it, expect, vi, beforeEach } from "vitest";

const guards: unknown[] = [];
const feedMock = vi.hoisted(() => vi.fn(async () => []));
const findAgentMock = vi.hoisted(() => vi.fn(async () => ({ id: "agent-1" })));
const assignedMock = vi.hoisted(() => vi.fn(async () => ["camp-a"]));

vi.mock("@/server/repositories", () => ({
  campaignCreatives: { listFeedForAgent: feedMock },
  agents: { findByMembershipId: findAgentMock },
  campaignAssignments: { findCampaignIdsForAgencyOrAgent: assignedMock },
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>, options: unknown) => {
      guards.push(options);
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, {
            ...(ctx as object),
            user: { id: "u-1", role: "agent" },
            agencyId: "agency-1",
            membership: { id: "m-1" },
          });
        } catch (e: unknown) {
          const err = e as { message?: string; status?: number };
          return actual.fail(err.message ?? "Internal server error", err.status ?? 500);
        }
      };
    },
  };
});

const { GET } = await import("./route");

function get(url: string) {
  return GET(new Request(`http://x${url}`), { params: Promise.resolve({}) });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/cms/creatives (P2.1)", () => {
  it("is readable with calls:view (agent role)", () => {
    expect(guards).toHaveLength(1);
    expect(guards[0]).toMatchObject({ resource: "calls", action: "view" });
  });

  it("passes the agent's assigned campaigns to the feed", async () => {
    const res = await get("/api/v1/cms/creatives?placement=agent_hero");
    expect(res.status).toBe(200);
    expect(assignedMock).toHaveBeenCalledWith("agency-1", "agent-1");
    expect(feedMock).toHaveBeenCalledWith("agency-1", ["camp-a"], "agent_hero");
  });

  it("rejects unknown placements", async () => {
    const res = await get("/api/v1/cms/creatives?placement=banner");
    expect(res.status).toBe(400);
    expect(feedMock).not.toHaveBeenCalled();
  });
});
