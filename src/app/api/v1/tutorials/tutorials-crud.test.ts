import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.hoisted(() => vi.fn(async (d: unknown) => ({ id: "t-new", ...(d as object) })));
const updateMock = vi.hoisted(() => vi.fn(async (d: unknown, body: unknown) => ({ id: d, ...(body as object) })));
const deleteMock = vi.hoisted(() => vi.fn(async () => undefined));
const findByIdMock = vi.hoisted(() => vi.fn(async (id: string) => ({ id })));
const findAllMock = vi.hoisted(() =>
  vi.fn(async () => [
    { id: "t-1", category: "general" },
    { id: "t-2", category: "onboarding" },
  ]),
);
const findPublishedMock = vi.hoisted(() =>
  vi.fn(async () => [
    { id: "t-1", category: "general" },
    { id: "t-2", category: "onboarding" },
  ]),
);

vi.mock("@/server/repositories", () => ({
  tutorials: {
    create: createMock,
    update: updateMock,
    softDelete: deleteMock,
    findById: findByIdMock,
    findByAgency: findAllMock,
    findPublishedWithProgress: findPublishedMock,
  },
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
            user: { id: "user-1", role: "agent" },
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

const { GET, POST } = await import("./route");
const detail = await import("./[id]/route");

function jsonReq(method: string, url: string, body?: unknown) {
  return new Request(`http://x${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const listCtx = { params: Promise.resolve({}) };
const detailCtx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/v1/tutorials (P2.2 — display fields no longer dropped)", () => {
  it("forwards thumbnail/order/published/required to the repo", async () => {
    const res = await POST(
      jsonReq("POST", "/api/v1/tutorials", {
        title: "Onboarding",
        content: "Watch this",
        category: "onboarding",
        video_url: "https://cdn/x.mp4",
        duration_seconds: 120,
        tags: ["a"],
        thumbnail_url: "https://cdn/t.png",
        order_index: 3,
        published: true,
        required: true,
      }),
      listCtx,
    );
    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agency_id: "agency-1",
        thumbnail_url: "https://cdn/t.png",
        order_index: 3,
        published: true,
        required: true,
      }),
    );
  });

  it("422s missing title/content instead of inserting junk", async () => {
    const res = await POST(jsonReq("POST", "/api/v1/tutorials", { title: "", content: "" }), listCtx);
    expect(res.status).toBe(422);
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/tutorials category filter", () => {
  it("filters agent-visible rows by ?category=", async () => {
    const res = await GET(jsonReq("GET", "/api/v1/tutorials?category=onboarding"), listCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([{ id: "t-2", category: "onboarding" }]);
  });
});

describe("PATCH /api/v1/tutorials/[id] (whitelisted update)", () => {
  it("passes display fields through and strips agency_id", async () => {
    const res = await detail.PATCH(
      jsonReq("PATCH", "/api/v1/tutorials/t-1", {
        title: "New title",
        published: true,
        order_index: 5,
        agency_id: "agency-evil",
      }),
      detailCtx("t-1"),
    );
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      "t-1",
      expect.not.objectContaining({ agency_id: expect.anything() }),
      "agency-1",
    );
    expect(updateMock).toHaveBeenCalledWith(
      "t-1",
      expect.objectContaining({ title: "New title", published: true, order_index: 5 }),
      "agency-1",
    );
  });

  it("422s bad category instead of writing it", async () => {
    const res = await detail.PATCH(jsonReq("PATCH", "/api/v1/tutorials/t-1", { category: "nope" }), detailCtx("t-1"));
    expect(res.status).toBe(422);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("GET/DELETE /api/v1/tutorials/[id] scoping", () => {
  it("GET scopes to the caller agency", async () => {
    const res = await detail.GET(jsonReq("GET", "/api/v1/tutorials/t-1"), detailCtx("t-1"));
    expect(res.status).toBe(200);
    expect(findByIdMock).toHaveBeenCalledWith("t-1", "agency-1");
  });

  it("DELETE soft-deletes within the agency scope", async () => {
    const res = await detail.DELETE(jsonReq("DELETE", "/api/v1/tutorials/t-1"), detailCtx("t-1"));
    expect(res.status).toBe(204);
    expect(deleteMock).toHaveBeenCalledWith("t-1", "agency-1");
  });
});
