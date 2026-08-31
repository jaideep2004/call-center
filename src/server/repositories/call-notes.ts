import { query } from "@/server/db";
import type { PoolClient } from "pg";

export interface CallNoteRow {
  id: string;
  call_id: string;
  agent_id: string | null;
  agency_id: string | null;
  body: string;
  created_at: string;
}

export async function listNotes(callId: string, agencyId?: string, client?: PoolClient): Promise<CallNoteRow[]> {
  const params: unknown[] = [callId];
  let where = `call_id = $1`;
  if (agencyId) {
    where += ` AND agency_id = $2`;
    params.push(agencyId);
  }
  return query<CallNoteRow>(`SELECT * FROM app.call_notes WHERE ${where} ORDER BY created_at ASC`, params, client);
}

export async function createNote(input: { call_id: string; agent_id?: string | null; agency_id?: string | null; body: string }, client?: PoolClient): Promise<CallNoteRow> {
  const row = await query<CallNoteRow>(
    `INSERT INTO app.call_notes (call_id, agent_id, agency_id, body) VALUES ($1,$2,$3,$4) RETURNING *`,
    [input.call_id, input.agent_id ?? null, input.agency_id ?? null, input.body],
    client,
  );
  return row[0]!;
}
