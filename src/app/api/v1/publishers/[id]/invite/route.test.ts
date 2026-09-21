import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createPortalInviteMock = vi.hoisted(() =>
  vi.fn(async (_id: string, origin: string) => ({
    link: `${origin}/register?invite=tok-1`,
    email: "pub@example.com",
    name: "Pub",
  })),
);
const sendEmailMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@/server/services/publisher-portal", () => ({
  createPortalInvite: createPortalInviteMock,
}));

vi.mock("@/server/email", () => ({
  sendEmail: sendEmailMock,
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>, _opts: unknown) => {
      return (req: Request, ctx: unknown) => handler(req, ctx);
    },
  };
});

const { POST } = await import("./route");

const originalAppBase = process.env.APP_BASE_URL;
const originalPublicBase = process.env.NEXT_PUBLIC_APP_URL;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  if (originalAppBase === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = originalAppBase;
  if (originalPublicBase === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = originalPublicBase;
});

function post() {
  // Admin clicks from localhost (dev/tunnel) — link must still be production.
  return POST(new Request("http://localhost:30001/api/v1/publishers/p1/invite", { method: "POST" }), {
    params: Promise.resolve({ id: "p1" }),
  });
}

describe("POST publisher invite link origin", () => {
  it("uses APP_BASE_URL over the request origin", async () => {
    process.env.APP_BASE_URL = "https://coveragecalls.com";
    const res = await post();
    expect(res.status).toBe(200);
    expect(createPortalInviteMock).toHaveBeenCalledWith("p1", "https://coveragecalls.com");
    const body = await res.json();
    expect(body.data.link).toBe("https://coveragecalls.com/register?invite=tok-1");
    expect(body.data.link).not.toContain("localhost");
  });

  it("falls back to request origin only when no env URL is set", async () => {
    delete process.env.APP_BASE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    const res = await post();
    expect(res.status).toBe(200);
    expect(createPortalInviteMock).toHaveBeenCalledWith("p1", "http://localhost:30001");
  });
});
