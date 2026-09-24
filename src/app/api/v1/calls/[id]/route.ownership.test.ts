import { describe, it, expect, vi, beforeEach } from "vitest";

const findByIdMock = vi.hoisted(() => vi.fn());
const eventsMock = vi.hoisted(() => vi.fn(async () => []));
const findAgentMock = vi.hoisted(() => vi.fn(async () => ({ id: "agent-own" })));
const updateMock = vi.hoisted(() => vi.fn(async (id: string) => ({ id })));
const claimStateMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/repositories", () => ({
  calls: { findById: findByIdMock, update: updateMock, claimState: claimStateMock },
  callEvents: { findByCallId: eventsMock },
  agents: { findByMembershipId: findAgentMock },
}));

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
            user: { id: "u-1", role: "agent" },
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

const { PATCH } = await import("./route");

function patch(id: string, body: unknown) {
  return PATCH(
    new Request(`http://x/api/v1/calls/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ctxIsHead = false;
  findAgentMock.mockResolvedValue({ id: "agent-own" } as never);
});

describe("PATCH /calls/[id] ownership (review: agency-wide IDOR)", () => {
  it("404s a plain agent forcing a teammate's call state", async () => {
    findByIdMock.mockResolvedValue({ id: "call-1", agent_id: "agent-victim", agency_id: "agency-1", state: "ringing" });
    const res = await patch("call-1", { state: "missed" });
    expect(res.status).toBe(404);
    expect(claimStateMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("404s a plain agent patching a teammate's call without state change", async () => {
    findByIdMock.mockResolvedValue({ id: "call-1", agent_id: "agent-victim", agency_id: "agency-1", state: "ended" });
    const res = await patch("call-1", { notes: "x" });
    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("allows the owning agent's update through", async () => {
    findByIdMock.mockResolvedValue({ id: "call-1", agent_id: "agent-own", agency_id: "agency-1", state: "ended" });
    const res = await patch("call-1", { notes: "x" });
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalled();
  });

  it("heads bypass ownership", async () => {
    ctxIsHead = true;
    findByIdMock.mockResolvedValue({ id: "call-1", agent_id: "agent-victim", agency_id: "agency-1", state: "ended" });
    const res = await patch("call-1", { notes: "x" });
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalled();
  });
});
