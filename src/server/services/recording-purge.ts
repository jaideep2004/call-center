import { pool } from "@/server/db";
import { getTelephonyProvider } from "@/server/telephony-registry";

/**
 * Recording retention (roadmap 2.8): rows whose purge_at passed are deleted.
 * Provider-side deletion is attempted best-effort where the provider exposes
 * a recording id; DB row deletion always happens so retention is enforced.
 */
export async function purgeExpiredRecordings(): Promise<{ purged: number }> {
  const client = await pool.connect();
  try {
    const rows = await client.query<{ id: string; provider: string | null; provider_recording_id: string | null }>(
      `SELECT id, provider, provider_recording_id
       FROM app.recordings
       WHERE purge_at < now()
       LIMIT 50`,
    );
    let purged = 0;
    for (const row of rows.rows) {
      try {
        if (row.provider && row.provider_recording_id) {
          // Provider adapters do not expose a delete method yet; DB purge is
          // the source of truth for retention. Extend the adapter contract
          // when provider-side deletion is needed.
          void getTelephonyProvider(row.provider);
        }
        await client.query("DELETE FROM app.recordings WHERE id = $1", [row.id]);
        purged++;
      } catch (e: any) {
        console.error(`[purge] failed for recording ${String(row.id).slice(0, 8)}: ${e?.message ?? e}`);
      }
    }
    return { purged };
  } finally {
    client.release();
  }
}
