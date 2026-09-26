import { describe, it, expect, vi, beforeEach } from "vitest";

const guards: unknown[] = [];
const queryMock = vi.hoisted(() => vi.fn());
const queryOneMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  query: queryMock,
  queryOne: queryOneMock,
  transaction: transactionMock,
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>, options: unknown) => {
      guards.push(options);
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, {
            ...(ctx as object),
            user: { id: "u-admin", role: "admin" },
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

function del(id: string) {
  return new Request(`http://x/api/v1/users/${id}`, { method: "DELETE" });
}
const ctxFor = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/v1/users/[id]", () => {
  it("is guarded admin-only (users:delete, no head elevation)", async () => {
    expect(guards.length).toBe(1);
    expect(guards[0]).toMatchObject({ resource: "users", action: "delete" });
    expect(guards[0]).not.toMatchObject({ allowHead: true });
  });

  it("404 when the user does not exist", async () => {
    queryOneMock.mockResolvedValue(null);
    const res = await route.DELETE(del("u-missing"), ctxFor("u-missing"));
    expect(res.status).toBe(404);
  });

  it("400 on self-delete", async () => {
    queryOneMock.mockResolvedValue({ id: "u-admin", role: "admin" });
    const res = await route.DELETE(del("u-admin"), ctxFor("u-admin"));
    expect(res.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("400 when deleting the last admin", async () => {
    queryOneMock
      .mockResolvedValueOnce({ id: "u-last", role: "admin" })
      .mockResolvedValueOnce({ count: "0" });
    const res = await route.DELETE(del("u-last"), ctxFor("u-last"));
    expect(res.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("hard-deletes an agent user and returns the id", async () => {
    queryOneMock.mockResolvedValue({ id: "u-agent", role: "agent" });
    transactionMock.mockImplementation(async (fn: (c: unknown) => Promise<void>) => fn({}));
    const res = await route.DELETE(del("u-agent"), ctxFor("u-agent"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ id: "u-agent" });
    // invites -> agents -> memberships -> publishers unlink -> session -> account -> user
    expect(queryMock).toHaveBeenCalledTimes(7);
  });

  it("409 when linked history blocks the delete (FK violation)", async () => {
    queryOneMock.mockResolvedValue({ id: "u-busy", role: "agent" });
    transactionMock.mockRejectedValue({ code: "23503" });
    const res = await route.DELETE(del("u-busy"), ctxFor("u-busy"));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toMatch(/suspend/i);
  });
});
