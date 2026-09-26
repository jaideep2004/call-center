import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/repositories", () => ({
  invoices: { create: vi.fn(async () => ({ id: "inv-1" })) },
}));

let ctxRole = "agent";

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>, options: { resource: string; action: string; allowHead?: boolean }) => {
      return async (req: Request, ctx: unknown) => {
        try {
          if (!(options.allowHead && ctxRole === "head-agent")) {
            actual.requirePermission(ctxRole, options.resource as never, options.action as never);
          }
          return await handler(req, {
            ...(ctx as object),
            user: { id: "u-1", role: ctxRole === "head-agent" ? "agent" : ctxRole },
            agencyId: "agency-1",
            membership: { id: "m-1", agency_id: "agency-1", role: "agent" },
            isHead: ctxRole === "head-agent",
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
    new Request("http://x/api/v1/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agency_id: "agency-1", call_id: "00000000-0000-0000-0000-000000000001", total_cents: 5000 }),
    }),
    { params: Promise.resolve({}) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ctxRole = "agent";
});

describe("POST /invoices mint guard", () => {
  it("403s plain agents (no arbitrary invoice minting)", async () => {
    const res = await post();
    expect(res.status).toBe(403);
  });

  it("allows heads via allowHead elevation", async () => {
    ctxRole = "head-agent";
    const res = await post();
    expect(res.status).toBe(200);
  });

  it("allows admins via manage", async () => {
    ctxRole = "admin";
    const res = await post();
    expect(res.status).toBe(200);
  });
});
