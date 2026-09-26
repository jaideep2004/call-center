import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyMock = vi.hoisted(() => vi.fn(async () => ({ rows: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } })));
const createMock = vi.hoisted(() => vi.fn(async () => ({ id: "e-1" })));
const findAgentMock = vi.hoisted(() => vi.fn(async () => ({ id: "agent-own" })));

vi.mock("@/server/repositories", () => ({
  walletEntries: { findMany: findManyMock, create: createMock },
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

const { GET, POST } = await import("./route");

function get() {
  return GET(
    new Request("http://x/api/v1/wallet/entries?page=1&limit=10", { method: "GET" }),
    { params: Promise.resolve({}) } as never,
  );
}

function post(body: unknown) {
  return POST(
    new Request("http://x/api/v1/wallet/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) } as never,
  );
}

const validEntry = {
  agency_id: "agency-1",
  type: "manual_adjustment",
  amount_cents: 500,
  currency: "USD",
  idempotency_key: "adj-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  ctxRole = "agent";
  ctxIsHead = false;
  findAgentMock.mockResolvedValue({ id: "agent-own" } as never);
});

describe("wallet entries isolation + schema", () => {
  it("forces plain agents to their own rows on GET", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { agency_id: "agency-1", agent_id: "agent-own" } }),
    );
  });

  it("accepts ledger_type entries (top_up/charge/...) instead of 500ing", async () => {
    ctxRole = "admin";
    const res = await post(validEntry);
    expect(res.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "manual_adjustment", amount_cents: 500 }),
    );
  });

  it("422s legacy deposit/withdrawal types", async () => {
    ctxRole = "admin";
    const res = await post({ ...validEntry, type: "deposit" });
    expect(res.status).toBe(422);
    expect(createMock).not.toHaveBeenCalled();
  });
});
