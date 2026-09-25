import { describe, it, expect, vi, beforeEach } from "vitest";

const agentsMock = vi.hoisted(() => ({
  findByMembershipId: vi.fn(),
  findByUserId: vi.fn(),
  create: vi.fn(),
}));
const dbQueryMock = vi.hoisted(() => vi.fn(async () => []));

vi.mock("@/server/repositories", () => ({ agents: agentsMock }));
vi.mock("@/server/db", () => ({ query: dbQueryMock, queryOne: vi.fn(), transaction: vi.fn() }));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, {
            ...(ctx as object),
            user: { id: "u-9", role: "agent" },
            agencyId: null,
            membership: undefined,
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
  return POST(
    new Request("http://x/api/v1/agents/auto-create", { method: "POST" }),
    { params: Promise.resolve({}) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  agentsMock.findByMembershipId.mockResolvedValue(null);
  agentsMock.findByUserId.mockResolvedValue(null);
  agentsMock.create.mockResolvedValue({ id: "agent-new" });
});

describe("POST /agents/auto-create pending signups", () => {
  it("creates a pending membership-less row for fresh signups", async () => {
    const res = await post();
    expect(res.status).toBe(201);
    expect(agentsMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ agency_id: null, membership_id: null, user_id: "u-9" }),
    );
  });

  it("is idempotent for existing pending rows", async () => {
    agentsMock.findByUserId.mockResolvedValue({ id: "agent-9", approval_status: "pending" });
    const res = await post();
    expect(res.status).toBe(200);
    expect(agentsMock.create).not.toHaveBeenCalled();
  });
});
