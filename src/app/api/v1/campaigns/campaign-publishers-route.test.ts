import { describe, it, expect, vi, beforeEach } from "vitest";

const findByIdMock = vi.hoisted(() => vi.fn(async (id: string) => ({ id, agency_id: "agency-1" })));
const getPublisherIdsMock = vi.hoisted(() => vi.fn(async () => ["pub-a"]));
const setPublisherIdsMock = vi.hoisted(() => vi.fn(async (_id: string, ids: string[]) => ids));
const updateMock = vi.hoisted(() => vi.fn(async (id: string) => ({ id })));

vi.mock("@/server/repositories", () => ({
  campaigns: {
    findById: findByIdMock,
    getPublisherIds: getPublisherIdsMock,
    setPublisherIds: setPublisherIdsMock,
    update: updateMock,
  },
}));

vi.mock("@/server/services/skills.service", () => ({
  assertValidSkills: (s: string[]) => Promise.resolve(s),
}));

vi.mock("@/server/crypto", () => ({
  encryptSecret: () => "enc",
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

const publishersRoute = await import("./[id]/publishers/route");
const campaignRoute = await import("./[id]/route");

function req(method: string, url: string, body?: unknown) {
  return new Request(`http://x${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("campaign publishers sub-route (multi-publisher)", () => {
  it("GET scopes findById to the agency then returns join ids", async () => {
    const res = await publishersRoute.GET(req("GET", "/x"), ctx("camp-1"));
    expect(res.status).toBe(200);
    expect(findByIdMock).toHaveBeenCalledWith("camp-1", "agency-1");
    expect(getPublisherIdsMock).toHaveBeenCalledWith("camp-1");
    const body = await res.json();
    expect(body.data).toEqual({ campaign_id: "camp-1", publisher_ids: ["pub-a"] });
  });

  it("PUT replaces the join set (dedup lives in the repo)", async () => {
    const res = await publishersRoute.PUT(req("PUT", "/x", { publisher_ids: ["pub-a", "pub-b"] }), ctx("camp-1"));
    expect(res.status).toBe(200);
    expect(setPublisherIdsMock).toHaveBeenCalledWith("camp-1", ["pub-a", "pub-b"]);
  });

  it("PUT clears with [] and 422s a non-array", async () => {
    const cleared = await publishersRoute.PUT(req("PUT", "/x", { publisher_ids: [] }), ctx("camp-1"));
    expect(cleared.status).toBe(200);
    expect(setPublisherIdsMock).toHaveBeenCalledWith("camp-1", []);

    const bad = await publishersRoute.PUT(req("PUT", "/x", { publisher_ids: "pub-a" }), ctx("camp-1"));
    expect(bad.status).toBe(422);
  });
});

describe("PATCH /api/v1/campaigns/[id] publisher branching", () => {
  it("publisher_ids-only skips campaigns.update and returns the scoped row", async () => {
    const res = await campaignRoute.PATCH(req("PATCH", "/x", { publisher_ids: ["p1"] }), ctx("camp-1"));
    expect(res.status).toBe(200);
    expect(setPublisherIdsMock).toHaveBeenCalledWith("camp-1", ["p1"]);
    expect(updateMock).not.toHaveBeenCalled();
    expect(findByIdMock).toHaveBeenCalledWith("camp-1", "agency-1");
  });

  it("single publisher_id syncs the join table too", async () => {
    const res = await campaignRoute.PATCH(req("PATCH", "/x", { publisher_id: "pub-solo" }), ctx("camp-1"));
    expect(res.status).toBe(200);
    expect(setPublisherIdsMock).toHaveBeenCalledWith("camp-1", ["pub-solo"]);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("null publisher_id clears the join set", async () => {
    const res = await campaignRoute.PATCH(req("PATCH", "/x", { publisher_id: null }), ctx("camp-1"));
    expect(res.status).toBe(200);
    expect(setPublisherIdsMock).toHaveBeenCalledWith("camp-1", []);
  });

  it("mixed publisher + field update syncs joins AND updates columns", async () => {
    const res = await campaignRoute.PATCH(
      req("PATCH", "/x", { publisher_ids: ["p1"], name: "New name" }),
      ctx("camp-1"),
    );
    expect(res.status).toBe(200);
    expect(setPublisherIdsMock).toHaveBeenCalledWith("camp-1", ["p1"]);
    expect(updateMock).toHaveBeenCalledWith("camp-1", expect.objectContaining({ name: "New name" }), "agency-1");
    // publisher_ids must not leak into the column update
    const [, data] = updateMock.mock.calls[0] as unknown as [string, Record<string, unknown>, string];
    expect(data).not.toHaveProperty("publisher_ids");
    expect(data).not.toHaveProperty("publisher_id");
  });
});
