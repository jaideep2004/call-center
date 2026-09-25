import { query } from "@/server/db";

/**
 * Retreaver-sourced recordings. Telnyx-side recording is off (zero webhooks
 * ever), but Retreaver rows carry recording_url — this bridges them into
 * app.recordings so agent/admin Recordings pages (and download links) work.
 * Idempotent (call_id + storage_path are UNIQUE; ON CONFLICT DO NOTHING) and
 * additive-only: never updates or deletes existing rows.
 */
export async function syncRecordingsFromRetreaver(agencyId?: string): Promise<{ synced: number }> {
  const params: unknown[] = [];
  let agencyClause = "";
  if (agencyId) {
    params.push(agencyId);
    agencyClause = `AND c.agency_id = $${params.length}`;
  }
  const rows = await query<{ id: string }>(
    `INSERT INTO app.recordings (agency_id, call_id, storage_path, content_type, provider, provider_recording_id, purge_at)
     SELECT c.agency_id, c.id, r.recording_url, 'audio/mpeg', 'retreaver', NULL, NOW() + INTERVAL '90 days'
       FROM app.calls c
       JOIN app.retreaver_calls r ON r.id = c.retreaver_call_id
      WHERE r.recording_url IS NOT NULL AND r.recording_url <> ''
        AND NOT EXISTS (SELECT 1 FROM app.recordings rec WHERE rec.call_id = c.id)
        ${agencyClause}
     ON CONFLICT DO NOTHING
     RETURNING id`,
    params,
  );
  return { synced: rows.length };
}

/** Single-call attempt used right after a link is established. Never throws. */
export async function linkRecordingForCall(callId: string): Promise<boolean> {
  try {
    const rows = await query<{ id: string }>(
      `INSERT INTO app.recordings (agency_id, call_id, storage_path, content_type, provider, provider_recording_id, purge_at)
       SELECT c.agency_id, c.id, r.recording_url, 'audio/mpeg', 'retreaver', NULL, NOW() + INTERVAL '90 days'
         FROM app.calls c
         JOIN app.retreaver_calls r ON r.id = c.retreaver_call_id
        WHERE c.id = $1
          AND r.recording_url IS NOT NULL AND r.recording_url <> ''
          AND NOT EXISTS (SELECT 1 FROM app.recordings rec WHERE rec.call_id = c.id)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [callId],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}
