import { sharedBoss } from "@/server/services/boss";

/**
 * Best-effort bridge from the webhook (Next server) into the worker's
 * pg-boss "finalize-call" queue. Billing runs off the webhook hot path and —
 * critically — AFTER the call-state transaction commits, so the worker always
 * sees state = 'ended'. finalizeCall is idempotent (per-call invoice anchor),
 * so enqueue retries/redeliveries are safe.
 *
 * Uses the shared start-once boss (boss.ts).
 */

export async function enqueueFinalizeCall(callId: string): Promise<void> {
  const boss = await sharedBoss();
  await boss.send("finalize-call", { callId }, { retryLimit: 3, retryDelay: 10 });
}
