/**
 * Agent presence contract (shared by server queries and the dashboard tab).
 *
 * `availability` is a client-set flag; on its own it survives a killed tab,
 * a crashed browser, or a lost network and reports phantom online agents
 * forever. Presence is therefore only trusted while its heartbeat stamp is
 * fresh: online tabs refresh `presence_seen_at` every minute and every
 * count/routing query ignores stamps older than the TTL.
 */
export const PRESENCE_HEARTBEAT_MS = 60_000;
export const PRESENCE_TTL_SECONDS = 180;

/** SQL predicate: `alias`'s heartbeat is fresh enough to be treated online. */
export function presenceFreshSql(alias: string): string {
  return `${alias}.presence_seen_at > now() - interval '${PRESENCE_TTL_SECONDS} seconds'`;
}

/** SQL predicate: `alias`'s heartbeat is missing or expired. */
export function presenceStaleSql(alias: string): string {
  return `(${alias}.presence_seen_at IS NULL OR NOT (${presenceFreshSql(alias)}))`;
}
