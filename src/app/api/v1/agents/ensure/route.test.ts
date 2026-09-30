import { describe, it, expect, vi, beforeEach } from "vitest";

const findByUserIdMock = vi.hoisted(() => vi.fn());
const findByMembershipIdMock = vi.hoisted(() => vi.fn());
const adoptOrCreateMock = vi.hoisted(() => vi.fn());
const createMock = vi.hoisted(() => vi.fn());
const queryOneMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/repositories", () => ({
  agents: {
    findByUserId: findByUserIdMock,
    findByMembershipId: findByMembershipIdMock,
    adoptOrCreate: adoptOrCreateMock,
    create: createMock,
  },
}));

vi.mock("@/server/db", () => ({
  query: vi.fn(async () => []),
  queryOne: queryOneMock,
}));

const ensurePlatformMock = vi.hoisted(() =>
  vi.fn(async (): Promise<{ joined: boolean; membershipId: string | null; reason: string }> => ({
    joined: false,
    membershipId: null,
    reason: "no_platform_agency",
  })),
);
vi.mock("@/server/services/platform-agency", () => ({
  ensurePlatformMembership: ensurePlatformMock,
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>, options: unknown) => {
      void options;
      return (req: Request, ctx: unknown) =>
        handler(req, {
          ...(ctx as object),
          user: { id: "u-admin", role: "admin" },
        }).catch((e: unknown) => {
          const err = e as { message?: string; status?: number };
          return actual.fail(err.message ?? "Internal server error", err.status ?? 500);
        });
    },
  };
});

const route = await import("./route");

function post(body: unknown) {
  return new Request("http://x/api/v1/agents/ensure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({}) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/v1/agents/ensure", () => {
  it("400 without user_id", async () => {
    const res = await route.POST(post({}), ctx);
    expect(res.status).toBe(400);
  });

  it("404 for unknown users", async () => {
    queryOneMock.mockResolvedValue(null);
    const res = await route.POST(post({ user_id: "u-ghost" }), ctx);
    expect(res.status).toBe(404);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns the existing profile without creating a duplicate", async () => {
    queryOneMock.mockResolvedValue({ id: "u-9", role: "agent" });
    findByUserIdMock.mockResolvedValue({ id: "agent-9", user_id: "u-9" });
    const res = await route.POST(post({ user_id: "u-9" }), ctx);
    expect(res.status).toBe(200);
    expect(createMock).not.toHaveBeenCalled();
    expect(adoptOrCreateMock).not.toHaveBeenCalled();
  });

  it("creates a membership-less pending row for users with no agency", async () => {
    queryOneMock
      .mockResolvedValueOnce({ id: "u-9", role: "agent" })
      .mockResolvedValueOnce(null);
    findByUserIdMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "agent-new", agency_id: null });
    const res = await route.POST(post({ user_id: "u-9" }), ctx);
    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ agency_id: null, membership_id: null, user_id: "u-9" }),
    );
  });

  it("adopts into the agency for invited users with a membership", async () => {
    queryOneMock
      .mockResolvedValueOnce({ id: "u-9", role: "agent" })
      .mockResolvedValueOnce({ id: "m-9", agency_id: "agency-1" });
    findByUserIdMock.mockResolvedValue(null);
    adoptOrCreateMock.mockResolvedValue({ agent: { id: "agent-9" }, adopted: true });
    const res = await route.POST(post({ user_id: "u-9" }), ctx);
    expect(res.status).toBe(200);
    expect(adoptOrCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ agency_id: "agency-1", membership_id: "m-9", user_id: "u-9" }),
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it("places the new profile into the platform agency when configured", async () => {
    queryOneMock
      .mockResolvedValueOnce({ id: "u-9", role: "agent" })
      .mockResolvedValueOnce(null);
    findByUserIdMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "agent-new", agency_id: null });
    ensurePlatformMock.mockResolvedValueOnce({ joined: true, membershipId: "m-plat", reason: "joined_platform" });
    const res = await route.POST(post({ user_id: "u-9" }), ctx);
    expect(res.status).toBe(201);
    expect(ensurePlatformMock).toHaveBeenCalledWith("agent-new");
    const body = await res.json();
    expect(body.message).toMatch(/platform agency/i);
  });
});
