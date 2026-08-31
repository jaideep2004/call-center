import { PgBoss } from "pg-boss";

/**
 * Best-effort bridge from the webhook (Next server) into the worker's
 * pg-boss "route-call" queue. Enabled with CALL_ROUTING_ASYNC=1: the webhook
 * returns 202 right after the call is created and early-answered, and the
 * worker's route-call job performs agent selection + dialing off the hot path.
 */
let boss: PgBoss | null = null;

export function isAsyncRoutingEnabled(): boolean {
  return process.env.CALL_ROUTING_ASYNC === "1";
}

export async function enqueueRouteCall(callId: string): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required for async routing");
  if (!boss) {
    boss = new PgBoss({ connectionString, schema: "jobs" });
  }
  // start() is internally idempotent — safe to call on every enqueue.
  await boss.start();
  await boss.send("route-call", { callId }, { retryLimit: 2, retryDelay: 3 });
}
