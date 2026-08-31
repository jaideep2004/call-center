import { query, queryOne } from "@/server/db";

export interface AffiliateRow {
  id: string;
  agent_id: string;
  code: string;
  commission_pct: number;
  total_earned_cents: number;
  created_at: string;
}

export class AffiliateRepository {
  async findByAgentId(agentId: string): Promise<AffiliateRow | null> {
    return queryOne<AffiliateRow>(
      "SELECT * FROM app.affiliates WHERE agent_id = $1",
      [agentId],
    );
  }

  async findByCode(code: string): Promise<AffiliateRow | null> {
    return queryOne<AffiliateRow>(
      "SELECT * FROM app.affiliates WHERE code = $1",
      [code],
    );
  }

  async findMany(): Promise<AffiliateRow[]> {
    return query<AffiliateRow>("SELECT * FROM app.affiliates ORDER BY created_at DESC");
  }

  async create(data: { agent_id: string; code: string; commission_pct?: number }): Promise<AffiliateRow> {
    const row = await queryOne<AffiliateRow>(
      `INSERT INTO app.affiliates (agent_id, code, commission_pct)
       VALUES ($1, $2, $3) RETURNING *`,
      [data.agent_id, data.code, data.commission_pct ?? 5],
    );
    return row!;
  }

  async updateEarned(id: string, amount_cents: number): Promise<void> {
    await query(
      "UPDATE app.affiliates SET total_earned_cents = total_earned_cents + $1 WHERE id = $2",
      [amount_cents, id],
    );
  }
}

export const affiliates = new AffiliateRepository();
