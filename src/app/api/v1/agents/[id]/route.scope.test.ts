import { describe, it, expect, vi, beforeEach } from "vitest";

const findByIdWithUserMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());
const softDeleteMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/repositories", () => ({
  agents: {
    findByIdWithUser: findByIdWithUserMock,
    findByMembershipId: vi.fn(),
    update: updateMock,
    softDelete: softDeleteMock,
  },
}));

vi.mock("@/server/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
}));

vi.mock("@/server/services/agent-funding", () => ({
  onlineBlockers: vi.fn(async () => []),
}));

vi.mock("@/server/services/skills.service", () => ({
  assertValidSkills: vi.fn(async (s: unknown) => s),
}));

vi.mock("@/server/services/action-emails", () => ({
  sendAgentApproved: vi.fn(),
}));

// Regression ctx: platform admin who ALSO holds a membership (the default
// admin in agency 00000000). Single-item routes must NOT scope them to it.
vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, {
            ...(ctx as object),
            user: { id: "u-admin", role: "admin" },
            agencyId: "agency-00000000",
            membership: { id: "m-admin", agency_id: "agency-00000000", role: "admin" },
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

const route = await import("./route");

function req(method: string, body?: unknown) {
  return new Request(`http://x/api/v1/agents/agent-9`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({ id: "agent-9" }) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("agents/[id] admin scope regression", () => {
  it("GET is unscoped for admins (pending signup with agency NULL loads)", async () => {
    findByIdWithUserMock.mockResolvedValue({ id: "agent-9", agency_id: null });
    const res = await route.GET(req("GET"), ctx);
    expect(res.status).toBe(200);
    expect(findByIdWithUserMock).toHaveBeenCalledWith("agent-9", undefined);
  });

  it("PATCH approval is unscoped for admins (no 'agent not found')", async () => {
    updateMock.mockResolvedValue({ id: "agent-9", agency_id: null });
    const res = await route.PATCH(req("PATCH", { approval_status: "approved" }), ctx);
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      "agent-9",
      expect.objectContaining({ approval_status: "approved" }),
      undefined,
    );
  });

  it("DELETE is unscoped for admins", async () => {
    softDeleteMock.mockResolvedValue(undefined);
    const res = await route.DELETE(req("DELETE"), ctx);
    expect(res.status).toBe(204);
    expect(softDeleteMock).toHaveBeenCalledWith("agent-9", undefined);
  });
});
