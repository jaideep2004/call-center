import { describe, it, expect, vi, beforeEach } from "vitest";

const constructions: Array<{ connectionString: string; schema: string }> = [];
let starts = 0;
let failNextStart = false;

vi.mock("pg-boss", () => ({
  PgBoss: class {
    opts: unknown;
    constructor(opts: unknown) {
      constructions.push(opts as { connectionString: string; schema: string });
      this.opts = opts;
    }
    async start() {
      starts++;
      if (failNextStart) {
        failNextStart = false;
        throw new Error("connect failed");
      }
    }
    async send() {}
  },
}));

beforeEach(async () => {
  vi.resetModules();
  constructions.length = 0;
  starts = 0;
  failNextStart = false;
  process.env.DATABASE_URL = "postgres://test/db";
});

describe("sharedBoss (Phase 1.1)", () => {
  it("starts once and shares one client across queues", async () => {
    const { sharedBoss } = await import("./boss");
    const { enqueueRouteCall } = await import("./route-queue");
    const { enqueueFinalizeCall } = await import("./finalize-queue");

    await enqueueRouteCall("call-1");
    await enqueueFinalizeCall("call-1");
    await enqueueRouteCall("call-2");

    expect(constructions.length).toBe(1);
    expect(starts).toBe(1);
  });

  it("retries start after a failure instead of caching rejection", async () => {
    const { sharedBoss } = await import("./boss");
    failNextStart = true;
    await expect(sharedBoss()).rejects.toThrow("connect failed");
    const boss = await sharedBoss();
    expect(boss).toBeTruthy();
    expect(starts).toBe(2);
  });

  it("fails fast without DATABASE_URL", async () => {
    delete process.env.DATABASE_URL;
    const { sharedBoss } = await import("./boss");
    await expect(sharedBoss()).rejects.toThrow("DATABASE_URL");
  });
});
