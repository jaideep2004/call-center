import "dotenv/config";
import { pool } from "@/server/db";
import { storeRecording } from "@/server/services/recording-store";

/**
 * One-off backfill: stores recordings for calls that got a call.recording.saved
 * event but have no recordings row yet. Run: npx tsx src/scripts/backfill-recordings.ts
 */
async function main() {
  const { rows } = await pool.query(`
    SELECT c.id AS call_id, c.agency_id, c.provider, c.provider_call_id,
           e.raw_redacted->'data'->'payload'->>'recording_id' AS recording_id
    FROM app.calls c
    JOIN app.call_events e ON e.call_id = c.id
    WHERE c.state = 'ended'
      AND e.raw_redacted->'data'->>'event_type' = 'call.recording.saved'
      AND NOT EXISTS (SELECT 1 FROM app.recordings r WHERE r.call_id = c.id)
    GROUP BY c.id, c.agency_id, c.provider, c.provider_call_id, recording_id
  `);

  console.log(`Found ${rows.length} calls with pending recordings`);
  let stored = 0;
  let failed = 0;

  for (const r of rows) {
    if (!r.recording_id) {
      console.error(`skipped ${r.call_id}: no recording_id in event payload`);
      failed += 1;
      continue;
    }
    try {
      const rec = await storeRecording({
        callId: r.call_id,
        agencyId: r.agency_id,
        provider: r.provider,
        recordingId: r.recording_id,
        providerCallId: r.provider_call_id,
      });
      console.log(`stored ${rec.call_id}: ${rec.duration_seconds ?? "?"}s -> ${rec.storage_path.slice(0, 64)}`);
      stored += 1;
    } catch (e: any) {
      console.error(`failed ${r.call_id}: ${e?.message ?? e}`);
      failed += 1;
    }
  }

  console.log(`Done: ${stored} stored, ${failed} failed`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});