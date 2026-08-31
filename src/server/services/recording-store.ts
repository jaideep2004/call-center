import { PgBoss } from "pg-boss";
import { recordings } from "@/server/repositories";
import { getTelephonyProvider } from "@/server/telephony-registry";

export interface StoreRecordingInput {
  callId: string;
  agencyId: string;
  provider: string;
  recordingId: string;
  providerCallId?: string;
}

/**
 * Fetches a recording from the provider and stores a recordings row.
 * Idempotent: returns the existing row when the call already has one.
 * Throws on failure so pg-boss retries the job.
 */
export async function storeRecording(input: StoreRecordingInput) {
  const existing = await recordings.findByCallId(input.callId);
  if (existing) return existing;

  const provider = getTelephonyProvider(input.provider);
  const info = await provider.fetchRecording({
    recordingId: input.recordingId,
    providerCallId: input.providerCallId,
  });

  return recordings.create({
    agency_id: input.agencyId,
    call_id: input.callId,
    storage_path: info.url,
    content_type: info.contentType,
    duration_seconds: info.durationSeconds,
    provider: input.provider,
    provider_recording_id: input.recordingId,
  });
}

/**
 * Provider download URLs are presigned and expire (Telnyx: 10 minutes).
 * Re-sign a fresh URL when the row carries a provider recording id;
 * falls back to the stored path for legacy rows.
 */
export async function resolveRecordingStreamUrl(recording: {
  provider?: string;
  provider_recording_id?: string | null;
  storage_path: string;
}): Promise<string> {
  if (recording.provider_recording_id && recording.provider) {
    const provider = getTelephonyProvider(recording.provider);
    const info = await provider.fetchRecording({ recordingId: recording.provider_recording_id });
    return info.url;
  }
  return recording.storage_path;
}

let bossPromise: Promise<PgBoss> | null = null;

function boss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) throw new Error("DATABASE_URL is required for recording queue");
      const b = new PgBoss({ connectionString, schema: "jobs" });
      await b.start();
      return b;
    })();
  }
  return bossPromise;
}

/**
 * Enqueues recording storage with retries. The webhook path must never
 * fail because the queue is briefly unavailable — enqueue errors are
 * logged by the caller, not thrown.
 */
export async function enqueueRecordingStore(input: StoreRecordingInput) {
  const b = await boss();
  await b.send("store-recording", input, {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
  });
}