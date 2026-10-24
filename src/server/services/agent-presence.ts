import { pool } from "@/server/db";
import { PRESENCE_TTL_SECONDS } from "@/lib/presence";

/**
 * Flip `available` agents whose heartbeat expired back to offline. Counts and
 * routing already ignore stale stamps; this sweep keeps every other consumer
 * (admin roster, wallet list, agent detail) telling the same truth. Runs from
 * the 30s call-maintenance tick, serialized with the rest of the sweep.
 */
export async function expireStalePresence(): Promise<number> {
  const result = await pool.query<{ id: string }>(
    `UPDATE app.agents
        SET availability = 'offline', presence_seen_at = NULL
      WHERE availability = 'available'
        AND (presence_seen_at IS NULL
             OR presence_seen_at <= now() - interval '${PRESENCE_TTL_SECONDS} seconds')
      RETURNING id`,
  );
  return result.rowCount ?? result.rows.length;
}
