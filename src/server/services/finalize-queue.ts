import { PgBoss } from "pg-boss";

/**
 * Best-effort bridge from the webhook (Next server) into the worker's
 * pg-boss "finalize-call" queue. Billing runs off the webhook hot path and —
 * critically — AFTER the call-state transaction commits, so the worker always
 * sees state = 'ended'. finalizeCall is idempotent (per-call invoice anchor),
 * so enqueue retries/redeliveries are safe.
 */
let boss: PgBoss | null = null;

export async function enqueueFinalizeCall(callId: string): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required for async finalize");
  if (!boss) {
    boss = new PgBoss({ connectionString, schema: "jobs" });
  }
  // start() is internally idempotent — safe to call on every enqueue.
  await boss.start();
  await boss.send("finalize-call", { callId }, { retryLimit: 3, retryDelay: 10 });
}
