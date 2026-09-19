import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.hoisted(() => vi.fn(async (d: unknown) => ({ id: "cc-1", ...(d as object) })));
const updateMock = vi.hoisted(() => vi.fn(async (): Promise<unknown> => ({ id: "cc-1", title: "Updated" })));
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
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
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

const { PATCH, DELETE } = await import("./admin/creatives/route");

function req(method: string, url: string, body?: unknown) {
  return new Request(`http://x${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({}) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/v1/cms/admin/creatives (gaps)", () => {
  it("400s without ?id=", async () => {
    const res = await PATCH(req("PATCH", "/api/v1/cms/admin/creatives", { title: "x" }), ctx);
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("422s invalid bodies", async () => {
    const res = await PATCH(req("PATCH", "/api/v1/cms/admin/creatives?id=cc-1", { priority: -1 }), ctx);
    expect(res.status).toBe(422);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("404s cross-agency campaign links", async () => {
    findCampaignMock.mockRejectedValueOnce(new Error("not found"));
    const res = await PATCH(
      req("PATCH", "/api/v1/cms/admin/creatives?id=cc-1", { campaign_id: "camp-other" }),
      ctx,
    );
    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("404s when the creative does not exist", async () => {
    updateMock.mockResolvedValueOnce(null);
    const res = await PATCH(req("PATCH", "/api/v1/cms/admin/creatives?id=cc-missing", { title: "x" }), ctx);
    expect(res.status).toBe(404);
  });

  it("updates and returns the row on success", async () => {
    const res = await PATCH(req("PATCH", "/api/v1/cms/admin/creatives?id=cc-1", { title: "Updated" }), ctx);
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith("cc-1", "agency-1", expect.objectContaining({ title: "Updated" }));
  });
});

describe("DELETE /api/v1/cms/admin/creatives (gaps)", () => {
  it("400s without ?id=", async () => {
    const res = await DELETE(req("DELETE", "/api/v1/cms/admin/creatives"), ctx);
    expect(res.status).toBe(400);
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
