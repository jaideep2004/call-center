import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    publicApiHandler: (handler: (req: Request) => Promise<Response>) => handler,
  };
});

global.fetch = fetchMock as unknown as typeof fetch;

const { POST } = await import("./route");

function post(body: unknown) {
  return POST(
    new Request("http://x/api/v1/auth/verify-captcha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) } as never,
  );
}

const SAVED_SECRET = process.env.RECAPTCHA_SECRET_KEY;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RECAPTCHA_SECRET_KEY = "test-secret";
});

describe("POST /api/v1/auth/verify-captcha", () => {
  it("accepts a Google-verified token", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ success: true }) });
    const res = await post({ token: "tok-1" });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.google.com/recaptcha/api/siteverify",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("403s failed verifications", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ success: false }) });
    const res = await post({ token: "tok-bad" });
    expect(res.status).toBe(403);
  });

  it("400s missing tokens", async () => {
    const res = await post({});
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("501s when the secret is not configured", async () => {
    delete process.env.RECAPTCHA_SECRET_KEY;
    try {
      const res = await post({ token: "tok-1" });
      expect(res.status).toBe(501);
    } finally {
      process.env.RECAPTCHA_SECRET_KEY = "test-secret";
    }
  });
});
