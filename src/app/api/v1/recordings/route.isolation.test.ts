import { describe, it, expect, vi, beforeEach } from "vitest";

const findByAgentMock = vi.hoisted(() => vi.fn(async () => [{ id: "r-1" }]));
const findByCallForAgentMock = vi.hoisted(() => vi.fn(async () => ({ id: "r-2" })));
const findByAgencyMock = vi.hoisted(() => vi.fn(async () => [{ id: "r-1" }, { id: "r-9" }]));
const findByCallMock = vi.hoisted(() => vi.fn(async () => ({ id: "r-9" })));
const findAgentMock = vi.hoisted(() => vi.fn(async () => ({ id: "agent-own" })));

vi.mock("@/server/repositories", () => ({
  recordings: {
    findByAgent: findByAgentMock,
    findByCallIdForAgent: findByCallForAgentMock,
    findByAgency: findByAgencyMock,
    findByCallId: findByCallMock,
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
    new Request(`http://x/api/v1/recordings${qs}`, { method: "GET" }),
    { params: Promise.resolve({}) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ctxRole = "agent";
  ctxIsHead = false;
  findAgentMock.mockResolvedValue({ id: "agent-own" } as never);
});

describe("GET /recordings agent isolation", () => {
  it("lists only the agent's own calls' recordings", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(findByAgentMock).toHaveBeenCalledWith("agency-1", "agent-own");
    expect(findByAgencyMock).not.toHaveBeenCalled();
  });

  it("scopes single-call lookup to the agent's own calls", async () => {
    const res = await get("?call_id=call-1");
    expect(res.status).toBe(200);
    expect(findByCallForAgentMock).toHaveBeenCalledWith("call-1", "agent-own");
    expect(findByCallMock).not.toHaveBeenCalled();
  });

  it("heads keep the agency-wide view", async () => {
    ctxIsHead = true;
    const res = await get();
    expect(res.status).toBe(200);
    expect(findByAgencyMock).toHaveBeenCalledWith("agency-1");
  });
});
