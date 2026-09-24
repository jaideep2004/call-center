import { describe, it, expect, vi, beforeEach } from "vitest";

const saveKeysMock = vi.hoisted(() => vi.fn());
const setModeMock = vi.hoisted(() => vi.fn());
const balanceRetrieveMock = vi.hoisted(() => vi.fn(async () => ({ livemode: false })));

vi.mock("@/server/stripe", () => ({
  getStripeStatus: vi.fn(async () => ({ mode: "test", test_configured: true, live_configured: false })),
  saveStripeKeys: saveKeysMock,
  setStripeMode: setModeMock,
  invalidateStripeCache: vi.fn(),
  getStripe: vi.fn(async () => ({ balance: { retrieve: balanceRetrieveMock } })),
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, {
            ...(ctx as object),
            user: { id: "u-a", role: "admin" },
            agencyId: null,
            membership: null,
            isHead: false,
          });
        } catch (e: unknown) {
          const err = e as { message?: string; status?: number };
          return actual.fail(err.message ?? "Internal server error", err.status ?? 500);
        }
      };
    },
  };
});

const { PUT } = await import("./route");

function put(body: unknown) {
  return PUT(
    new Request("http://x/api/v1/settings/stripe", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PUT /settings/stripe mode switch", () => {
  it("saves per-mode keys and switches mode", async () => {
    const res = await put({ mode: "test", test_secret_key: "sk_test_111", test_webhook_secret: "whsec_test_111" });
    expect(res.status).toBe(200);
    expect(saveKeysMock).toHaveBeenCalledWith(
      expect.objectContaining({ test_secret_key: "sk_test_111", test_webhook_secret: "whsec_test_111" }),
    );
    expect(setModeMock).toHaveBeenCalledWith("test");
    const body = await res.json();
    expect(body.data).toMatchObject({ saved: true, verified: true, mode: "test" });
  });

  it("422s when the target mode has no keys (nothing half-switched)", async () => {
    setModeMock.mockRejectedValueOnce(new Error("No live secret key saved yet — paste it first"));
    const res = await put({ mode: "live" });
    expect(res.status).toBe(422);
  });

  it("400s malformed secrets", async () => {
    const res = await put({ test_secret_key: "not-a-stripe-key" });
    expect(res.status).toBe(400);
  });
});
