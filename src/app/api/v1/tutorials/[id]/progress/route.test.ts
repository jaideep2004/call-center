import { describe, it, expect, vi, beforeEach } from "vitest";

const recordMock = vi.hoisted(() => vi.fn(async () => ({ tutorial_id: "t-1", completed: false })));
const progressMock = vi.hoisted(() => vi.fn(async (): Promise<unknown> => null));
const findTutorialMock = vi.hoisted(() => vi.fn(async () => ({ id: "t-1" })));

vi.mock("@/server/repositories", () => ({
  tutorials: {
    recordProgress: recordMock,
    progressFor: progressMock,
    findById: findTutorialMock,
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
            user: { id: "user-agent-1", role: "agent" },
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

const { PATCH, GET } = await import("./route");

function req(method: string, body?: unknown) {
  return new Request("http://x/api/v1/tutorials/t-1/progress", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({ id: "t-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tutorial progress API (P2.2)", () => {
  it("records progress for the session user (body user never trusted)", async () => {
    const res = await PATCH(req("PATCH", { watched_seconds: 45, watched_percent: 50, user_id: "user-evil" }), ctx);
    expect(res.status).toBe(200);
    expect(recordMock).toHaveBeenCalledWith("t-1", "user-agent-1", {
      watched_seconds: 45,
      watched_percent: 50,
    });
  });

  it("422s invalid progress bodies", async () => {
    const res = await PATCH(req("PATCH", { watched_percent: 999 }), ctx);
    expect(res.status).toBe(422);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("404s unknown tutorials", async () => {
    findTutorialMock.mockRejectedValueOnce(new Error("not found"));
    const res = await PATCH(req("PATCH", { watched_seconds: 10, watched_percent: 10 }), ctx);
    expect(res.status).toBe(404);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("GET returns the viewer's own progress", async () => {
    progressMock.mockResolvedValueOnce({ tutorial_id: "t-1", watched_percent: 90, completed: true });
    const res = await GET(req("GET"), ctx);
    expect(res.status).toBe(200);
    expect(progressMock).toHaveBeenCalledWith("t-1", "user-agent-1");
  });
});
