import { describe, it, expect, vi, beforeEach } from "vitest";

const blockersMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn(async (id: string) => ({ id })));

vi.mock("@/server/repositories", () => ({
  agents: { update: updateMock, findByMembershipId: vi.fn() },
}));

vi.mock("@/server/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => ({ membership_id: "m-1", approval_status: "approved" })),
}));

vi.mock("@/server/services/agent-funding", () => ({
  onlineBlockers: blockersMock,
}));

vi.mock("@/server/services/skills.service", () => ({
  assertValidSkills: vi.fn(async (s: unknown) => s),
}));

vi.mock("@/server/services/action-emails", () => ({
  sendAgentApproved: vi.fn(),
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
    new Request(`http://x/api/v1/agents/${id}`, {
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
  blockersMock.mockResolvedValue([]);
});

describe("PATCH /agents/[id] go-online checklist", () => {
  it("blocks with the specific missing pieces (not a generic funding error)", async () => {
    blockersMock.mockResolvedValue(["a topped-up wallet", "at least one live campaign (Take Calls → Live Campaigns)"]);
    const res = await patch("agent-1", { availability: "available" });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.message).toContain("topped-up wallet");
    expect(body.message).toContain("live campaign");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("goes online when the checklist is clear", async () => {
    const res = await patch("agent-1", { availability: "available" });
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalled();
  });
});
