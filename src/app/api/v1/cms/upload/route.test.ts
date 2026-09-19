import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>, options: unknown) => {
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, {
            ...(ctx as object),
            user: { id: "u-admin", role: "admin" },
            agencyId: "agency-1",
            membership: { id: "m-admin" },
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

function uploadRequest(file?: Blob) {
  const form = new FormData();
  if (file) form.set("file", file, "ad.png");
  return POST(
    new Request("http://x/api/v1/cms/upload", { method: "POST", body: form }),
    { params: Promise.resolve({}) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("POST /api/v1/cms/upload (P2.1)", () => {
  it("400s without a file", async () => {
    const res = await uploadRequest(undefined);
    expect(res.status).toBe(400);
  });

  it("415s unsupported media types", async () => {
    const res = await uploadRequest(new Blob(["x"], { type: "application/pdf" }));
    expect(res.status).toBe(415);
  });

  it("413s oversized images", async () => {
    const big = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: "image/png" });
    const res = await uploadRequest(big);
    expect(res.status).toBe(413);
  });

  it("503s with a clear message when storage is unconfigured", async () => {
    const res = await uploadRequest(new Blob(["x"], { type: "image/png" }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.message).toMatch(/paste a media URL/i);
  });
});
