import { describe, it, expect, vi, beforeEach } from "vitest";

const transferMock = vi.hoisted(() => vi.fn(async () => ({ id: "t-1" })));

vi.mock("@/server/repositories", () => ({
  walletTransfers: { transferToAgent: transferMock },
}));

let ctxIsHead = false;
let ctxRole = "agent";

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    // Faithful emulation of the real apiHandler guard: the matrix check is
    // skipped ONLY when the route declares allowHead AND the caller is a
    // head. This tests the route's declared options, not the mock.
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>, options: { resource: string; action: string; allowHead?: boolean }) => {
      return async (req: Request, ctx: unknown) => {
        try {
          if (!(options.allowHead && ctxIsHead)) {
            actual.requirePermission(ctxRole, options.resource as never, options.action as never);
          }
          return await handler(req, {
            ...(ctx as object),
            user: { id: ctxIsHead ? "u-h" : "u-1", role: ctxRole },
            agencyId: "agency-1",
            membership: { id: ctxIsHead ? "m-h" : "m-1", agency_id: "agency-1", role: "agent" },
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

const { POST } = await import("./route");

function post(body: unknown) {
  return POST(
    new Request("http://x/api/v1/wallet/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) } as never,
  );
}

const validBody = { agent_id: "00000000-0000-0000-0000-000000000001", amount_cents: 500, reason: "bonus" };

beforeEach(() => {
  vi.clearAllMocks();
  ctxIsHead = false;
  ctxRole = "agent";
});

describe("POST /wallet/transfer head access", () => {
  it("403s plain agents (Ledger transfer buttons would lie otherwise)", async () => {
    const res = await post(validBody);
    expect(res.status).toBe(403);
    expect(transferMock).not.toHaveBeenCalled();
  });

  it("allows heads via allowHead elevation", async () => {
    ctxIsHead = true;
    const res = await post(validBody);
    expect(res.status).toBe(200);
    expect(transferMock).toHaveBeenCalled();
  });
});
