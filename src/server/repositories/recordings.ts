import { BaseRepository } from "./base";
import { queryOne, query } from "@/server/db";

export interface RecordingRow {
  id: string;
  agency_id: string;
  call_id: string;
  storage_path: string;
  content_type: string;
  duration_seconds: number | null;
  purge_at: string;
  consent_captured_at: string | null;
  created_at: string;
  provider: string;
  provider_recording_id: string | null;
}

export class RecordingRepository extends BaseRepository<RecordingRow> {
  protected schema = "app";
  protected table = "recordings";

  async findByCallId(callId: string): Promise<RecordingRow | null> {
    return queryOne<RecordingRow>(
      "SELECT * FROM app.recordings WHERE call_id = $1",
      [callId],
    );
  }

  async findByAgency(agencyId: string): Promise<RecordingRow[]> {
    const { rows } = await super.findMany({
      filters: { agency_id: agencyId },
      sortBy: "created_at",
      order: "desc",
    });
    return rows;
  }

  async create(data: {
    agency_id: string;
    call_id: string;
    storage_path: string;
    content_type?: string;
    duration_seconds?: number;
    provider?: string;
    provider_recording_id?: string;
  }): Promise<RecordingRow> {
    return super.create({
      agency_id: data.agency_id,
      call_id: data.call_id,
      storage_path: data.storage_path,
      content_type: data.content_type ?? "audio/wav",
      duration_seconds: data.duration_seconds ?? null,
      provider: data.provider ?? "telnyx",
      provider_recording_id: data.provider_recording_id ?? null,
      purge_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  async delete(id: string, agencyId: string): Promise<void> {
    await query("DELETE FROM app.recordings WHERE id = $1 AND agency_id = $2", [id, agencyId]);
  }
}

export const recordings = new RecordingRepository();
