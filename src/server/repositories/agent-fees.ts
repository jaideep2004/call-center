import { query, queryOne, transaction } from "@/server/db";
import type { PoolClient } from "pg";

export interface AgentFeeRow {
  id: string;
  agent_id: string;
  agency_id: string;
  kind: "dialer" | "software";
  amount_cents: number;
  status: "pending" | "charged" | "waived" | "failed";
  due_date: string;
  invoice_id: string | null;
  charged_at: string | null;
  created_at: string;
}

export class AgentFeeRepository {
  async create(
    data: { agent_id: string; agency_id: string; kind: string; amount_cents: number; due_date: string; invoice_id?: string },
    client?: PoolClient,
  ): Promise<AgentFeeRow> {
    const row = await queryOne<AgentFeeRow>(
      `INSERT INTO app.agent_fees (agent_id, agency_id, kind, amount_cents, due_date, invoice_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (agent_id, kind, due_date) DO NOTHING
       RETURNING *`,
      [data.agent_id, data.agency_id, data.kind, data.amount_cents, data.due_date, data.invoice_id ?? null],
      client,
    );
    return row!;
  }

  async findPendingByAgency(agencyId: string): Promise<AgentFeeRow[]> {
    return query<AgentFeeRow>(
      "SELECT * FROM app.agent_fees WHERE agency_id = $1 AND status = 'pending' ORDER BY due_date ASC, created_at ASC",
      [agencyId],
    );
  }

  async findByIdForAgency(id: string, agencyId: string): Promise<AgentFeeRow | null> {
    return queryOne<AgentFeeRow>(
      "SELECT * FROM app.agent_fees WHERE id = $1 AND agency_id = $2",
      [id, agencyId],
    );
  }

  async setStatus(id: string, status: string, client?: PoolClient): Promise<AgentFeeRow | null> {
    return queryOne<AgentFeeRow>(
      `UPDATE app.agent_fees
       SET status = $2, charged_at = CASE WHEN $2 = 'charged' THEN now() ELSE charged_at END, updated_at = now()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, status],
      client,
    );
  }

  /** Idempotent per (agent, kind, due month): returns null when already generated. */
  async ensureMonthlyFee(
    data: { agent_id: string; agency_id: string; kind: string; amount_cents: number; due_date: string },
    client?: PoolClient,
  ): Promise<AgentFeeRow | null> {
    return this.create(data, client);
  }
}

export const agentFees = new AgentFeeRepository();
