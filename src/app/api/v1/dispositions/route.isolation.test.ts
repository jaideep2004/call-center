import { describe, it, expect, vi, beforeEach } from "vitest";

const findByAgencyMock = vi.hoisted(() => vi.fn(async () => []));
const findPendingMock = vi.hoisted(() => vi.fn(async () => []));
const findByCallMock = vi.hoisted(() => vi.fn(async () => null));
const findAgentMock = vi.hoisted(() => vi.fn(async () => ({ id: "agent-own" })));

vi.mock("@/server/repositories", () => ({
  dispositions: {
    findByAgency: findByAgencyMock,
    findPendingByAgency: findPendingMock,
    findByCallIdForAgency: findByCallMock,
  },
  agents: { findByMembershipId: findAgentMock },
}));

let ctxRole = "agent";
let ctxIsHead = false;

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, {
            ...(ctx as object),
            user: { id: "u-1", role: ctxRole },
            agencyId: "agency-1",
            membership: { id: "m-1", agency_id: "agency-1", role: "agent" },
            isHead: ctxIsHead,
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

function get(qs = "") {
  return GET(
    new Request(`http://x/api/v1/dispositions${qs}`, { method: "GET" }),
    { params: Promise.resolve({}) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ctxRole = "agent";
  ctxIsHead = false;
  findAgentMock.mockResolvedValue({ id: "agent-own" } as never);
});

describe("GET /dispositions agent isolation", () => {
  it("forces plain agents to their own dispositions", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(findByAgencyMock).toHaveBeenCalledWith("agency-1", "agent-own");
  });

  it("scopes pending and call_id lookups too", async () => {
    await get("?status=pending");
    expect(findPendingMock).toHaveBeenCalledWith("agency-1", "agent-own");
    await get("?call_id=call-1");
    expect(findByCallMock).toHaveBeenCalledWith("call-1", "agency-1", "agent-own");
  });

  it("heads keep the agency-wide view", async () => {
    ctxIsHead = true;
    await get();
    expect(findByAgencyMock).toHaveBeenCalledWith("agency-1", undefined);
  });
});
