import { query } from "@/server/db";

export interface CallEventRow {
  id: string;
  agency_id: string;
  call_id: string;
  provider: string;
  provider_event_id: string;
  type: string;
  raw_redacted: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

export class CallEventRepository {
  async findByCallId(callId: string, agencyId?: string): Promise<CallEventRow[]> {
    if (agencyId) {
      return query<CallEventRow>(
        "SELECT * FROM app.call_events WHERE call_id = $1 AND agency_id = $2 ORDER BY occurred_at ASC",
        [callId, agencyId],
      );
    }
    return query<CallEventRow>(
      "SELECT * FROM app.call_events WHERE call_id = $1 ORDER BY occurred_at ASC",
      [callId],
    );
  }
}

export const callEvents = new CallEventRepository();
