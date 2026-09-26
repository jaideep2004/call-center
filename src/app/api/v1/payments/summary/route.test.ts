import { describe, it, expect, vi, beforeEach } from "vitest";

const summarizeMock = vi.hoisted(() => vi.fn());
const findAgentMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/repositories/payments", () => ({
  payments: { summarizeLiveCompleted: summarizeMock },
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

describe("GET /api/v1/payments/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("admin gets unscoped live totals", async () => {
    setCtx(adminCtx);
    summarizeMock.mockResolvedValue({ completed_count: 3, total_net_cents: 50000, total_fees_cents: 1500 });
    const res = await GET(new Request("http://x/api/v1/payments/summary"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(200);
    expect(summarizeMock).toHaveBeenCalledWith();
    const body = await res.json();
    expect(body.data).toMatchObject({ completed_count: 3, total_net_cents: 50000 });
  });

  it("heads get agency-scoped live totals", async () => {
    setCtx(headCtx);
    summarizeMock.mockResolvedValue({ completed_count: 1, total_net_cents: 10000, total_fees_cents: 300 });
    const res = await GET(new Request("http://x/api/v1/payments/summary"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(200);
    expect(summarizeMock).toHaveBeenCalledWith({ agencyId: "agency-1" });
  });

  it("agents get own live totals", async () => {
    setCtx(agentCtx);
    findAgentMock.mockResolvedValue({ id: "agent-9" });
    summarizeMock.mockResolvedValue({ completed_count: 1, total_net_cents: 5000, total_fees_cents: 150 });
    const res = await GET(new Request("http://x/api/v1/payments/summary"), { params: Promise.resolve({}) } as never);
    expect(res.status).toBe(200);
    expect(summarizeMock).toHaveBeenCalledWith({ agentId: "agent-9" });
  });
});
