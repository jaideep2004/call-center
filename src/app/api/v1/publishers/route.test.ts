import { describe, it, expect, vi, beforeEach } from "vitest";

const findByEmailMock = vi.hoisted(() => vi.fn());
const createMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/repositories", () => ({
  publishers: {
    findByEmail: findByEmailMock,
    create: createMock,
    update: updateMock,
  },
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>, options: unknown) => {
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

vi.mock("@/server/services/retreaver", () => ({
  setPublisherStatus: vi.fn(),
}));

const listRoute = await import("./route");
const detailRoute = await import("./[id]/route");

function req(method: string, body: unknown) {
  return new Request("http://x/api/v1/publishers", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("publisher email uniqueness (0066)", () => {
  it("POST 409 when another publisher already uses the email", async () => {
    findByEmailMock.mockResolvedValue({ id: "pub-1", email: "dup@x.com" });
    const res = await listRoute.POST(
      req("POST", { name: "New", email: "DUP@x.com", commission_pct: 0 }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(409);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("POST creates when the email is free", async () => {
    findByEmailMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "pub-2", email: "free@x.com" });
    const res = await listRoute.POST(
      req("POST", { name: "New", email: "free@x.com", commission_pct: 0 }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalled();
  });

  it("POST 409 on a concurrent-create race (23505)", async () => {
    findByEmailMock.mockResolvedValue(null);
    createMock.mockRejectedValue({ code: "23505" });
    const res = await listRoute.POST(
      req("POST", { name: "New", email: "race@x.com", commission_pct: 0 }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(409);
  });

  it("POST skips the check when no email is given", async () => {
    createMock.mockResolvedValue({ id: "pub-3", email: null });
    const res = await listRoute.POST(
      req("POST", { name: "Serial only", commission_pct: 0 }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(201);
    expect(findByEmailMock).not.toHaveBeenCalled();
  });

  it("PATCH 409 when the email belongs to a different publisher", async () => {
    findByEmailMock.mockResolvedValue({ id: "pub-other", email: "taken@x.com" });
    const res = await detailRoute.PATCH(
      req("PATCH", { email: "taken@x.com" }),
      { params: Promise.resolve({ id: "pub-1" }) },
    );
    expect(res.status).toBe(409);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("PATCH allows keeping the publisher's own email", async () => {
    findByEmailMock.mockResolvedValue({ id: "pub-1", email: "mine@x.com" });
    updateMock.mockResolvedValue({ id: "pub-1", email: "mine@x.com" });
    const res = await detailRoute.PATCH(
      req("PATCH", { email: "mine@x.com" }),
      { params: Promise.resolve({ id: "pub-1" }) },
    );
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalled();
  });
});
