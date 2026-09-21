import { sharedBoss } from "@/server/services/boss";

/**
 * Best-effort bridge from the webhook (Next server) into the worker's
 * pg-boss "route-call" queue. Enabled with CALL_ROUTING_ASYNC=1: the webhook
 * returns 202 right after the call is created and early-answered, and the
 * worker's route-call job performs agent selection + dialing off the hot path.
 *
 * Uses the shared start-once boss (boss.ts) so enqueueing costs one send,
 * not a start() round trip per call.
 */

export function isAsyncRoutingEnabled(): boolean {
  return process.env.CALL_ROUTING_ASYNC === "1";
}

export async function enqueueRouteCall(callId: string): Promise<void> {
  const boss = await sharedBoss();
  await boss.send("route-call", { callId }, { retryLimit: 2, retryDelay: 3 });
}
