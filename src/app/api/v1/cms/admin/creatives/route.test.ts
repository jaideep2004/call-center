import { describe, it, expect, vi, beforeEach } from "vitest";

const guards: unknown[] = [];
const createMock = vi.hoisted(() => vi.fn(async (d: unknown) => ({ id: "cc-1", ...(d as object) })));
const updateMock = vi.hoisted(() => vi.fn(async () => ({ id: "cc-1" })));
const listMock = vi.hoisted(() => vi.fn(async () => []));
const deleteMock = vi.hoisted(() => vi.fn(async () => undefined));
const findCampaignMock = vi.hoisted(() => vi.fn(async () => ({ id: "camp-a" })));

vi.mock("@/server/repositories", () => ({
  campaignCreatives: {
    createCreative: createMock,
    updateCreative: updateMock,
    listCreatives: listMock,
    softDeleteCreative: deleteMock,
  },
  campaigns: { findById: findCampaignMock },
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
            user: { id: "u-admin", role: "admin" },
            agencyId: "agency-1",
            membership: { id: "m-admin" },
          });
        } catch (e: unknown) {
          const err = e as { message?: string; status?: number };
          return actual.fail(err.message ?? "Internal server error", err.status ?? 500);
        }
      };
    },
  };
});

const { GET, POST, PATCH, DELETE } = await import("./route");

function req(method: string, url: string, body?: unknown) {
  return new Request(`http://x${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({}) };

const BODY = { type: "image", title: "Ad", media_url: "https://cdn/x.png" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("admin creatives CRUD (P2.1)", () => {
  it("guards every route with cms:manage", () => {
    expect(guards).toHaveLength(4);
    for (const g of guards) expect(g).toMatchObject({ resource: "cms", action: "manage" });
  });

  it("POST links only same-agency campaigns", async () => {
    findCampaignMock.mockResolvedValueOnce({ id: "camp-a" });
    const res = await POST(req("POST", "/api/v1/cms/admin/creatives", { ...BODY, campaign_id: "camp-a" }), ctx);
    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ agency_id: "agency-1", campaign_id: "camp-a" }));
  });

  it("POST 404s cross-agency campaign links", async () => {
    findCampaignMock.mockRejectedValueOnce(new Error("not found"));
    const res = await POST(req("POST", "/api/v1/cms/admin/creatives", { ...BODY, campaign_id: "camp-other" }), ctx);
    expect(res.status).toBe(404);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("POST 422s invalid bodies", async () => {
    const res = await POST(req("POST", "/api/v1/cms/admin/creatives", { type: "image" }), ctx);
    expect(res.status).toBe(422);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("DELETE soft-deletes and returns 204", async () => {
    const res = await DELETE(req("DELETE", "/api/v1/cms/admin/creatives?id=cc-1"), ctx);
    expect(res.status).toBe(204);
    expect(deleteMock).toHaveBeenCalledWith("cc-1", "agency-1");
  });
});
