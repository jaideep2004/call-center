import { describe, it, expect, vi, beforeEach } from "vitest";

const listRecentMock = vi.hoisted(() => vi.fn());
const findByAgencyMock = vi.hoisted(() => vi.fn());
const findByAgentMock = vi.hoisted(() => vi.fn());
const findAgentMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/repositories/payments", () => ({
  payments: {
    listRecent: listRecentMock,
    findByAgency: findByAgencyMock,
    findByAgent: findByAgentMock,
  },
}));

vi.mock("@/server/repositories", () => ({
  agents: { findByMembershipId: findAgentMock },
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>, options: unknown) => {
      void options;
      return (req: Request) => handler(req, (globalThis as { __ctx?: unknown }).__ctx);
    },
  };
});

const { GET } = await import("./route");

function setCtx(ctx: unknown) {
  (globalThis as { __ctx?: unknown }).__ctx = ctx;
}

const adminCtx = { user: { id: "u-a", role: "admin" }, agencyId: null, membership: null, isHead: false };
const headCtx = { user: { id: "u-h", role: "agent" }, agencyId: "agency-1", membership: { id: "m-h", agency_id: "agency-1", role: "agent" }, isHead: true };
const agentCtx = { user: { id: "u-9", role: "agent" }, agencyId: "agency-1", membership: { id: "m-9", agency_id: "agency-1", role: "agent" }, isHead: false };

describe("GET /api/v1/payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("admin sees platform-wide rows", async () => {
    setCtx(adminCtx);
    listRecentMock.mockResolvedValue([{ id: "pay-1" }]);
    const res = await GET(new Request("http://x/api/v1/payments"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(200);
    expect(listRecentMock).toHaveBeenCalled();
    const body = await res.json();
    expect(body.data).toEqual([{ id: "pay-1" }]);
  });

  it("heads see their agency rows", async () => {
    setCtx(headCtx);
    findByAgencyMock.mockResolvedValue([{ id: "pay-2" }]);
    const res = await GET(new Request("http://x/api/v1/payments"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(200);
    expect(findByAgencyMock).toHaveBeenCalledWith("agency-1");
    expect(listRecentMock).not.toHaveBeenCalled();
  });

  it("agents see only their own rows", async () => {
    setCtx(agentCtx);
    findAgentMock.mockResolvedValue({ id: "agent-9" });
    findByAgentMock.mockResolvedValue([{ id: "pay-3" }]);
    const res = await GET(new Request("http://x/api/v1/payments"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(200);
    expect(findByAgentMock).toHaveBeenCalledWith("agent-9");
    expect(listRecentMock).not.toHaveBeenCalled();
  });
});
