import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.hoisted(() => vi.fn());
const findBySlugMock = vi.hoisted(() => vi.fn(async () => null));

vi.mock("@/server/repositories", () => ({
  cmsSections: { create: createMock, findBySlug: findBySlugMock, findAll: vi.fn(async () => []) },
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
            user: { id: "u-a", role: "admin" },
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

const { POST } = await import("./route");

function post(body: unknown) {
  return POST(
    new Request("http://x/api/v1/cms/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /cms/admin retired slugs", () => {
  it.each(["creatives", "banner", "banners", "posts", "blog"])(
    "422s retired/separated slug %s with a redirect message",
    async (slug) => {
      const res = await post({ slug, title: "X", content: {} });
      expect(res.status).toBe(422);
      expect(createMock).not.toHaveBeenCalled();
    },
  );

  it("creates normal sections", async () => {
    createMock.mockResolvedValue({ id: "s-1" });
    const res = await post({ slug: "hero-faq", title: "T", content: {} });
    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalled();
  });
});
