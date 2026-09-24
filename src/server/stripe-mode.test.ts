import { describe, it, expect, vi, beforeEach } from "vitest";

const getMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/repositories/system-settings", () => ({
  systemSettings: { get: getMock, set: vi.fn() },
}));

const { systemSettings } = await import("@/server/repositories/system-settings");
const setSpy = vi.mocked(systemSettings.set);

const stripe = await import("./stripe");

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  process.env.ENCRYPTION_KEY = "test-encryption-key";
  stripe.invalidateStripeCache();
});

function settingsFor(map: Record<string, string>) {
  getMock.mockImplementation(async (key: string) => map[key] ?? null);
}

describe("stripe test/live mode resolution", () => {
  it("uses the test pair when mode is test", async () => {
    settingsFor({
      stripe_mode: "test",
      stripe_test_secret_key: "sk_test_111",
      stripe_test_webhook_secret: "whsec_test_111",
      stripe_live_secret_key: "sk_live_222",
      stripe_secret_key: "sk_live_legacy",
    });
    const client = await stripe.getStripe();
    expect(client).toBeTruthy();
    expect(await stripe.getStripeMode()).toBe("test");
    const status = await stripe.getStripeStatus();
    expect(status.mode).toBe("test");
    expect(status.test_configured).toBe(true);
    expect(status.live_configured).toBe(true);
  });

  it("falls back to legacy keys when no mode is set", async () => {
    settingsFor({ stripe_secret_key: "sk_live_legacy" });
    expect(await stripe.getStripeMode()).toBeNull();
    const status = await stripe.getStripeStatus();
    expect(status.mode).toBeNull();
    expect(status.active_key_mode).toBe("live");
  });

  it("setStripeMode throws when the target mode has no keys", async () => {
    settingsFor({ stripe_live_secret_key: "sk_live_222" });
    await expect(stripe.setStripeMode("test")).rejects.toThrow(/no test secret key/i);
  });

  it("setStripeMode mirrors the pair into the active slots", async () => {
    const store: Record<string, unknown> = {
      stripe_live_secret_key: "sk_live_222",
      stripe_live_webhook_secret: "whsec_live_222",
    };
    getMock.mockImplementation(async (key: string) => store[key] ?? null);
    await stripe.setStripeMode("live");
    expect(setSpy).toHaveBeenCalledWith("stripe_secret_key", expect.any(String));
    expect(setSpy).toHaveBeenCalledWith("stripe_webhook_secret", expect.any(String));
    expect(setSpy).toHaveBeenCalledWith("stripe_mode", "live");
  });
});
