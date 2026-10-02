import { describe, it, expect, vi, beforeEach } from "vitest";

const findByIdMock = vi.hoisted(() => vi.fn());
const findAgentMock = vi.hoisted(() => vi.fn(async () => ({ id: "agent-own", membership_id: "m-1" })));
const listMock = vi.hoisted(() => vi.fn(async () => []));
const createMock = vi.hoisted(() => vi.fn(async (input: unknown) => ({ id: "n-1", ...(input as object) })));

vi.mock("@/server/repositories", () => ({
  calls: { findById: findByIdMock },
  agents: { findByMembershipId: findAgentMock, findById: findAgentMock },
}));

vi.mock("@/server/repositories/call-notes", () => ({
  listNotes: listMock,
  createNote: createMock,
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
            user: { id: "u-1", role: "agent" },
            agencyId: "agency-1",
            membership: { id: "m-1" },
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

const { GET, POST } = await import("./route");

function req(method: string, body?: unknown) {
  return POST(
    new Request("http://x/api/v1/calls/call-1/notes", {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "call-1" }) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Platform-agency call assigned to this agent: agency-scoped lookup 404d it.
  findByIdMock.mockResolvedValue({ id: "call-1", agency_id: "00000000-0000-0000-0000-0000000000a1", agent_id: "agent-own" });
});

describe("call notes on platform-agency calls", () => {
  it("saves a note on the agent's own assigned call (unscoped lookup)", async () => {
    const res = await req("POST", { body: "follow up Tuesday" });
    expect(res.status).toBe(200);
    // Agency scope must NOT filter the lookup, or platform calls 404.
    expect(findByIdMock).toHaveBeenCalledWith("call-1", undefined);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ call_id: "call-1", agency_id: "00000000-0000-0000-0000-0000000000a1" }),
    );
  });

  it("lists notes without the agency filter for agents", async () => {
    const res = await GET(
      new Request("http://x/api/v1/calls/call-1/notes", { method: "GET" }),
      { params: Promise.resolve({ id: "call-1" }) } as never,
    );
    expect(res.status).toBe(200);
    expect(listMock).toHaveBeenCalledWith("call-1", undefined);
  });

  it("still 403s another agent's call", async () => {
    findByIdMock.mockResolvedValue({ id: "call-1", agency_id: "agency-1", agent_id: "agent-other" });
    findAgentMock.mockResolvedValueOnce({ id: "agent-own", membership_id: "m-1" });
    const res = await req("POST", { body: "snoop" });
    expect(res.status).toBe(403);
  });
});
