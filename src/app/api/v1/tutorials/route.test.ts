import { describe, it, expect, vi, beforeEach } from "vitest";

const findAllMock = vi.hoisted(() => vi.fn(async () => [{ id: "t-draft" }]));
const findPublishedMock = vi.hoisted(() => vi.fn(async () => [{ id: "t-live" }]));
let sessionRole = "agent";

vi.mock("@/server/repositories", () => ({
  tutorials: {
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
            user: { id: "user-1", role: sessionRole },
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
  sessionRole = "agent";
});

describe("GET /api/v1/tutorials role split (P2.2)", () => {
  it("agents see published tutorials with their progress", async () => {
    const res = await get("/api/v1/tutorials");
    expect(res.status).toBe(200);
    expect(findPublishedMock).toHaveBeenCalledWith("agency-1", "user-1");
    expect(findAllMock).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.data).toEqual([{ id: "t-live" }]);
  });

  it("admins see everything including drafts", async () => {
    sessionRole = "admin";
    const res = await get("/api/v1/tutorials");
    expect(res.status).toBe(200);
    expect(findAllMock).toHaveBeenCalledWith("agency-1");
    expect(findPublishedMock).not.toHaveBeenCalled();
  });
});
