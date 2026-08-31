import { query, queryOne } from "@/server/db";

export interface PaymentRow {
  id: string;
  agency_id: string;
  agent_id: string | null;
  plan_id: string | null;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export class PaymentRepository {
  async create(data: {
    agency_id: string;
    agent_id?: string;
    plan_id?: string;
    stripe_session_id: string;
    amount_cents: number;
    currency?: string;
  }): Promise<PaymentRow> {
    const row = await queryOne<PaymentRow>(
      `INSERT INTO app.payments (agency_id, agent_id, plan_id, stripe_session_id, amount_cents, currency)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.agency_id, data.agent_id ?? null, data.plan_id ?? null, data.stripe_session_id, data.amount_cents, data.currency ?? "usd"],
    );
    return row!;
  }

  async findBySessionId(sessionId: string): Promise<PaymentRow | null> {
    return queryOne<PaymentRow>(
      "SELECT * FROM app.payments WHERE stripe_session_id = $1",
      [sessionId],
    );
  }

  async markCompleted(id: string, paymentIntentId: string): Promise<PaymentRow> {
    const row = await queryOne<PaymentRow>(
      `UPDATE app.payments
       SET status = 'completed', stripe_payment_intent_id = $2, completed_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, paymentIntentId],
    );
    return row!;
  }

  async markFailed(id: string): Promise<PaymentRow> {
    const row = await queryOne<PaymentRow>(
      `UPDATE app.payments SET status = 'failed' WHERE id = $1 RETURNING *`,
      [id],
    );
    return row!;
  }

  async findByAgency(agencyId: string): Promise<PaymentRow[]> {
    return query<PaymentRow>(
      "SELECT * FROM app.payments WHERE agency_id = $1 ORDER BY created_at DESC",
      [agencyId],
    );
  }
}

export const payments = new PaymentRepository();
