import { pool } from "@/server/db";
import { getTelephonyProvider } from "@/server/telephony-registry";
import { handleNoAnswer } from "@/server/services/call-orchestrator";
import { enqueueRouteCall } from "@/server/services/route-queue";

/**
 * Advisory-lock key that serializes the ring/routing maintenance sweep across
 * every worker instance. pg-boss does not coordinate scheduled jobs across
 * instances by default; localConcurrency:1 only prevents overlap within one
 * process. Only one instance runs the sweep at a time; the next 30s tick picks
 * up any remainder. (Correctness no longer depends on this — all dialing and
 * failover is claim-guarded — but the lock avoids redundant overlapping work.)
 */
const CALL_MAINTENANCE_LOCK_KEY = 0x63616c6c_4d; // arbitrary stable int8 key ("callM")

interface StaleRingingRow {
  id: string;
}

interface StuckRoutingRow {
  id: string;
  provider: string;
  provider_call_id: string;
  routing_snapshot: Record<string, unknown> | null;
}

/**
 * Drives ring-timeout failover. Each call whose current ringing attempt has
 * exceeded its campaign's ring_timeout_seconds goes through handleNoAnswer,
 * which cancels the agent leg, re-routes to the next eligible agent (up to
 * campaign.max_ring_attempts), or hangs up the caller and marks the call
 * missed. handleNoAnswer is claim-guarded (ringing→routing) so overlapping
 * runs can never double-dial. Batched (`limit`) so a backlog can't balloon a
 * single tick's runtime into the next tick.
 */
export async function expireRingingCalls(options: { limit?: number } = {}): Promise<number> {
  const limit = options.limit ?? 25;

  // Orphan-ringing safety net. 45s grace so routeCall's in-flight dials
  // (claimed to 'ringing' with agent_id still NULL) are never swept.
  await pool.query(
    `UPDATE app.calls SET state = 'missed', routing_snapshot = routing_snapshot || '{"cleanup":"orphan_ringing"}'::jsonb
     WHERE state = 'ringing' AND agent_id IS NULL
       AND COALESCE(ring_started_at, started_at, now()) < now() - interval '45 seconds'`,
  ).catch(() => undefined);

  // Only agent'd ringing legs are candidates for a ring-timeout failover; the
  // no-agent in-flight dials are covered by the orphan net above.
  const result = await pool.query<StaleRingingRow>(
    `SELECT c.id
     FROM app.calls c
     LEFT JOIN app.campaigns camp ON camp.id = c.campaign_id
     WHERE c.state = 'ringing'
       AND c.agent_id IS NOT NULL
       AND COALESCE(c.ring_started_at, c.started_at)
         + COALESCE(camp.ring_timeout_seconds, 30) * INTERVAL '1 second' < NOW()
     ORDER BY c.ring_started_at ASC NULLS FIRST
     LIMIT $1`,
    [limit],
  );

  let expired = 0;
  for (const row of result.rows) {
    try {
      const outcome = await handleNoAnswer(row.id, "timeout");
      if (outcome) expired += 1;
    } catch (e: any) {
      console.error(`[expireRingingCalls] failed for call ${row.id}: ${e?.message ?? e}`);
    }
  }
  return expired;
}

/**
 * Recovery for calls stuck in 'routing': a route-call job that exhausted its
 * retries (pg-boss marks it failed) or a worker crash leaves the call in
 * 'routing' forever — the caller sits in silence. This re-enqueues such calls
 * so a fresh job (now idempotent via the routing→ringing claim) picks them up.
 * Calls that keep failing past `maxAttempts` are given up on: the answered
 * caller leg is cancelled and the call marked missed with a snapshot reason.
 */
export async function requeueStuckRoutingCalls(options: {
  maxAgeSeconds?: number;
  maxAttempts?: number;
  limit?: number;
} = {}): Promise<{ requeued: number; stuckFailed: number }> {
  const maxAgeSeconds = options.maxAgeSeconds ?? 90;
  const maxAttempts = options.maxAttempts ?? 3;
  const limit = options.limit ?? 25;

  const result = await pool.query<StuckRoutingRow>(
    `SELECT id, provider, provider_call_id, routing_snapshot
     FROM app.calls
     WHERE state = 'routing' AND updated_at < now() - ($1 * interval '1 second')
     ORDER BY updated_at ASC
     LIMIT $2`,
    [maxAgeSeconds, limit],
  );

  let requeued = 0;
  let stuckFailed = 0;
  for (const row of result.rows) {
    const snapshot = (row.routing_snapshot ?? {}) as Record<string, unknown>;
    const attempts = Number(snapshot.routing_requeues ?? 0);

    if (attempts >= maxAttempts) {
      const claim = await pool.query<{ id: string }>(
        `UPDATE app.calls SET state = 'missed', agent_id = NULL,
             routing_snapshot = routing_snapshot || '{"stuck":"requeue_exhausted"}'::jsonb
         WHERE id = $1 AND state = 'routing' RETURNING id`,
        [row.id],
      ).catch(() => ({ rows: [] }));
      if (claim.rows.length === 0) continue; // already moved on
      stuckFailed += 1;
      try {
        const provider = getTelephonyProvider(row.provider);
        await provider.cancel({ providerAttemptId: row.provider_call_id });
      } catch (e: any) {
        console.error(`[requeueStuckRoutingCalls] cancel caller leg failed for call=${row.id.slice(0, 8)}: ${e?.message ?? e}`);
      }
      continue;
    }

    // Safety-bump the counter first so this call can't be picked up by a
    // concurrent sweep while we're enqueueing it for a fresh attempt.
    const nextSnapshot = { ...snapshot, routing_requeues: attempts + 1, requeued_at: new Date().toISOString() };
    await pool.query(
      `UPDATE app.calls SET routing_snapshot = $2 WHERE id = $1 AND state = 'routing'`,
      [row.id, JSON.stringify(nextSnapshot)],
    ).catch(() => undefined);
    try {
      await enqueueRouteCall(row.id);
      requeued += 1;
    } catch (e: any) {
      console.error(`[requeueStuckRoutingCalls] enqueue failed for call=${row.id.slice(0, 8)}: ${e?.message ?? e}`);
    }
  }
  return { requeued, stuckFailed };
}

/**
 * Combined maintenance sweep for the expire-ringing-calls schedule: drive
 * ring-timeout failover, then recover stuck-routing calls. Serialized across
 * worker instances with a Postgres advisory lock (try-lock → skip if another
 * instance holds it).
 */
export async function runCallMaintenance(options?: { limit?: number }): Promise<{
  expired: number;
  requeued: number;
  stuckFailed: number;
  skipped: boolean;
}> {
  const client = await pool.connect();
  try {
    const lock = await client.query("SELECT pg_try_advisory_lock($1) AS ok", [CALL_MAINTENANCE_LOCK_KEY]);
    if (lock.rows[0]?.ok !== true) return { expired: 0, requeued: 0, stuckFailed: 0, skipped: true };

    const expired = await expireRingingCalls({ limit: options?.limit });
    const stuck = await requeueStuckRoutingCalls({ limit: options?.limit });
    return { expired, ...stuck, skipped: false };
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [CALL_MAINTENANCE_LOCK_KEY]).catch(() => undefined);
    client.release();
  }
}