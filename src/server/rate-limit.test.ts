import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { createRateLimiter, clientIp, _resetRateLimiterState } from "@/server/rate-limit";

describe("createRateLimiter", () => {
  beforeAll(() => {
    // Force the in-memory path — no Redis in unit tests.
    delete process.env.REDIS_URL;
  });

  afterEach(() => {
    _resetRateLimiterState();
    vi.useRealTimers();
  });

  it("allows up to max requests within the window, then blocks", async () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });

    expect(await limiter("ip-1")).toBe(true);
    expect(await limiter("ip-1")).toBe(true);
    expect(await limiter("ip-1")).toBe(true);
    expect(await limiter("ip-1")).toBe(false);
    expect(await limiter("ip-1")).toBe(false);
  });

  it("tracks keys independently", async () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });

    expect(await limiter("ip-1")).toBe(true);
    expect(await limiter("ip-2")).toBe(true);
    expect(await limiter("ip-1")).toBe(false);
    expect(await limiter("ip-2")).toBe(false);
  });

  it("resets after the window elapses", async () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });

    expect(await limiter("ip-1")).toBe(true);
    expect(await limiter("ip-1")).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(await limiter("ip-1")).toBe(true);
  });
});

describe("clientIp", () => {
  it("prefers the first x-forwarded-for entry", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
    });
    expect(clientIp(req)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip and then unknown", () => {
    const req1 = new Request("http://localhost", { headers: { "x-real-ip": "198.51.100.7" } });
    expect(clientIp(req1)).toBe("198.51.100.7");

    const req2 = new Request("http://localhost");
    expect(clientIp(req2)).toBe("unknown");
  });
});
