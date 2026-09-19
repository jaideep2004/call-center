import { describe, it, expect, vi, beforeEach } from "vitest";

const findNumberMock = vi.hoisted(() => vi.fn(async () => ({ id: "num-1", campaign_id: "camp-old" })));
const reassignMock = vi.hoisted(() => vi.fn(async (_id: string, cid: string | null) => ({ id: "num-1", campaign_id: cid })));
const findCampaignMock = vi.hoisted(() => vi.fn(async () => ({ id: "camp-new" })));

vi.mock("@/server/repositories", () => ({
  phoneNumbers: { findById: findNumberMock, reassign: reassignMock },
  campaigns: { findById: findCampaignMock },
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, {
            ...(ctx as object),
            user: { id: "u-1", role: "admin" },
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

const { PATCH } = await import("./route");

function patch(body?: unknown) {
  return PATCH(
    new Request("http://x/api/v1/phone-numbers/num-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "num-1" }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/v1/phone-numbers/[id] (move / unassign)", () => {
  it("moves a number to another same-agency campaign", async () => {
    const res = await patch({ campaign_id: "camp-new" });
    expect(res.status).toBe(200);
    expect(findNumberMock).toHaveBeenCalledWith("num-1", "agency-1");
    expect(findCampaignMock).toHaveBeenCalledWith("camp-new", "agency-1");
    expect(reassignMock).toHaveBeenCalledWith("num-1", "camp-new", "agency-1");
  });

  it("unassigns with null (spare pool, matches nothing)", async () => {
    const res = await patch({ campaign_id: null });
    expect(res.status).toBe(200);
    expect(findCampaignMock).not.toHaveBeenCalled();
    expect(reassignMock).toHaveBeenCalledWith("num-1", null, "agency-1");
  });

  it("404s unknown numbers within the agency scope", async () => {
    findNumberMock.mockRejectedValueOnce(new Error("not found"));
    const res = await patch({ campaign_id: null });
    expect(res.status).toBe(404);
    expect(reassignMock).not.toHaveBeenCalled();
  });

  it("404s cross-agency campaign moves", async () => {
    findCampaignMock.mockRejectedValueOnce(new Error("not found"));
    const res = await patch({ campaign_id: "camp-other" });
    expect(res.status).toBe(404);
    expect(reassignMock).not.toHaveBeenCalled();
  });

  it("422s invalid bodies", async () => {
    const res = await patch({ campaign_id: "" });
    expect(res.status).toBe(422);
    expect(reassignMock).not.toHaveBeenCalled();
  });
});
