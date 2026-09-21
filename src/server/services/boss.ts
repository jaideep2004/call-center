import { PgBoss } from "pg-boss";

/**
 * Single shared pg-boss client for the Next server process.
 *
 * Phase 1.1: the webhook hot path must not pay a `boss.start()` round trip
 * per call. start() opens connections and is only idempotent — not free.
 * This module starts once and reuses the promise across route-queue,
 * finalize-queue, and recording-store. A failed start clears the cache so
 * the next enqueue retries instead of caching a rejection forever.
 *
 * (The standalone worker in src/worker keeps its own client with
 * useListenNotify + poll tuning — different process, different needs.)
 */
let bossPromise: Promise<PgBoss> | null = null;

export function sharedBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) throw new Error("DATABASE_URL is required for job queue");
      const boss = new PgBoss({ connectionString, schema: "jobs" });
      await boss.start();
      return boss;
    })();
    bossPromise.catch(() => {
      bossPromise = null;
    });
  }
  return bossPromise;
}
