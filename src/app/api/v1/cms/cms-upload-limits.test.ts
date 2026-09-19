import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
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

const { POST } = await import("./upload/route");

function uploadRequest(file?: Blob) {
  const form = new FormData();
  if (file) form.set("file", file, "ad.mp4");
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

describe("POST /api/v1/cms/upload limits (video gap)", () => {
  it("400s empty files", async () => {
    const res = await uploadRequest(new Blob([], { type: "image/png" }));
    expect(res.status).toBe(400);
  });

  it("413s oversized videos with the video message", async () => {
    const big = new Blob([new Uint8Array(51 * 1024 * 1024)], { type: "video/mp4" });
    const res = await uploadRequest(big);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.message).toMatch(/Videos must be <= 50MB/);
  });

  it("images over 5MB keep the image message", async () => {
    const big = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: "image/png" });
    const res = await uploadRequest(big);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.message).toMatch(/Images must be <= 5MB/);
  });
});
