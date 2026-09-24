import { describe, it, expect, vi, beforeEach } from "vitest";

const findPublisherMock = vi.hoisted(() => vi.fn());
const clickStatsMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/services/publisher-portal", () => ({
  getPublisherForUser: findPublisherMock,
  getClickStats: clickStatsMock,
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
            user: { id: "u-pub", role: "publisher" },
            agencyId: null,
            membership: null,
            isHead: false,
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

beforeEach(() => {
  vi.clearAllMocks();
  findPublisherMock.mockResolvedValue({ id: "pub-1" });
  clickStatsMock.mockResolvedValue([{ campaign_id: "camp-1", clicks: 7 }]);
});

describe("GET /publisher/clicks", () => {
  it("returns the publisher's own click stats", async () => {
    const res = await GET(
      new Request("http://x/api/v1/publisher/clicks", { method: "GET" }),
      { params: Promise.resolve({}) } as never,
    );
    expect(res.status).toBe(200);
    expect(clickStatsMock).toHaveBeenCalledWith("pub-1");
    const body = await res.json();
    expect(body.data).toEqual([{ campaign_id: "camp-1", clicks: 7 }]);
  });

  it("404s unlinked accounts", async () => {
    findPublisherMock.mockResolvedValue(null);
    const res = await GET(
      new Request("http://x/api/v1/publisher/clicks", { method: "GET" }),
      { params: Promise.resolve({}) } as never,
    );
    expect(res.status).toBe(404);
    expect(clickStatsMock).not.toHaveBeenCalled();
  });
});
