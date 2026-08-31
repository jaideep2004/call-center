import { BaseRepository } from "./base";
import { query } from "@/server/db";

export interface DispositionRow {
  id: string;
  call_id: string;
  agent_id: string;
  outcome: string;
  notes: string | null;
  annual_premium_cents: number | null;
  admin_confirmed: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export class DispositionRepository extends BaseRepository<DispositionRow> {
  protected schema = "app";
  protected table = "dispositions";

  async findByCallId(callId: string): Promise<DispositionRow | null> {
    const rows = await query<DispositionRow>(
      "SELECT * FROM app.dispositions WHERE call_id = $1",
      [callId],
    );
    return rows[0] ?? null;
  }

  async findByCallIdForAgency(callId: string, agencyId: string): Promise<DispositionRow | null> {
    const rows = await query<DispositionRow>(
      `SELECT d.* FROM app.dispositions d
       JOIN app.calls c ON c.id = d.call_id
       WHERE d.call_id = $1 AND c.agency_id = $2`,
      [callId, agencyId],
    );
    return rows[0] ?? null;
  }

  async findByIdForAgency(id: string, agencyId: string): Promise<DispositionRow | null> {
    const rows = await query<DispositionRow>(
      `SELECT d.* FROM app.dispositions d
       JOIN app.calls c ON c.id = d.call_id
       WHERE d.id = $1 AND c.agency_id = $2`,
      [id, agencyId],
    );
    return rows[0] ?? null;
  }

  async findByAgency(agencyId: string): Promise<DispositionRow[]> {
    return query<DispositionRow>(
      `SELECT d.* FROM app.dispositions d
       JOIN app.calls c ON c.id = d.call_id
       WHERE c.agency_id = $1
       ORDER BY d.created_at DESC`,
      [agencyId],
    );
  }

  async findPendingByAgency(agencyId: string): Promise<DispositionRow[]> {
    return query<DispositionRow>(
      `SELECT d.* FROM app.dispositions d
       JOIN app.calls c ON c.id = d.call_id
       WHERE c.agency_id = $1 AND d.admin_confirmed = false
       ORDER BY d.created_at DESC`,
      [agencyId],
    );
  }

  async confirm(id: string, confirmedBy: string): Promise<DispositionRow> {
    const rows = await query<DispositionRow>(
      `UPDATE app.dispositions
       SET admin_confirmed = true, confirmed_by = $2, confirmed_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, confirmedBy],
    );
    return rows[0];
  }
}

export const dispositions = new DispositionRepository();
