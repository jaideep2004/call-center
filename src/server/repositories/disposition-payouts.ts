import { BaseRepository } from "./base";
import { query } from "@/server/db";

export interface DispositionPayoutRow {
  id: string;
  agency_id: string;
  outcome: string;
  amount_cents: number;
  currency: string;
  created_at: string;
}

export class DispositionPayoutRepository extends BaseRepository<DispositionPayoutRow> {
  protected schema = "app";
  protected table = "disposition_payouts";

  async findByAgency(agencyId: string): Promise<DispositionPayoutRow[]> {
    const { rows } = await this.findMany({ filters: { agency_id: agencyId } });
    return rows;
  }

  async upsert(agencyId: string, outcome: string, amountCents: number): Promise<DispositionPayoutRow> {
    const rows = await query<DispositionPayoutRow>(
      `INSERT INTO app.disposition_payouts (agency_id, outcome, amount_cents)
       VALUES ($1, $2, $3)
       ON CONFLICT (agency_id, outcome)
       DO UPDATE SET amount_cents = EXCLUDED.amount_cents
       RETURNING *`,
      [agencyId, outcome, amountCents],
    );
    return rows[0];
  }
}

export const dispositionPayouts = new DispositionPayoutRepository();
