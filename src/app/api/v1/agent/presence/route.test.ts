import { describe, it, expect, vi, beforeEach } from "vitest";

const touchPresenceMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/repositories", () => ({
  agents: { touchPresence: touchPresenceMock },
}));

let membership: { id: string; agency_id: string; role: string } | null = { id: "m-1", agency_id: "agency-1", role: "agent" };

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, {
            ...(ctx as object),
            user: { id: "u-1", role: "agent" },
            agencyId: "agency-1",
            membership,
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

function post() {
  return POST(new Request("http://x/api/v1/agent/presence", { method: "POST" }), {
    params: Promise.resolve({}),
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  membership = { id: "m-1", agency_id: "agency-1", role: "agent" };
  touchPresenceMock.mockResolvedValue(true);
});

describe("POST /agent/presence", () => {
  it("refreshes presence for the caller's membership", async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(touchPresenceMock).toHaveBeenCalledWith("m-1");
    const body = await res.json();
    expect(body.data.online).toBe(true);
  });

  it("reports offline when the agent row is not available", async () => {
    touchPresenceMock.mockResolvedValue(false);
    const res = await post();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.online).toBe(false);
  });

  it("404s without an agent membership", async () => {
    membership = null;
    const res = await post();
    expect(res.status).toBe(404);
    expect(touchPresenceMock).not.toHaveBeenCalled();
  });
});
