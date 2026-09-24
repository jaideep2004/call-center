import { query, queryOne } from "@/server/db";

export interface PaymentRow {
  id: string;
  agency_id: string;
  agent_id: string | null;
  plan_id: string | null;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  /** Net wallet credit. The Stripe processing fee passed to the user. */
  fee_cents: number;
  currency: string;
  /** Mirrors Stripe session.livemode — false = test-mode money. */
  livemode: boolean;
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
    fee_cents?: number;
    currency?: string;
    livemode?: boolean;
  }): Promise<PaymentRow> {
    const row = await queryOne<PaymentRow>(
      `INSERT INTO app.payments (agency_id, agent_id, plan_id, stripe_session_id, amount_cents, fee_cents, currency, livemode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [data.agency_id, data.agent_id ?? null, data.plan_id ?? null, data.stripe_session_id, data.amount_cents, data.fee_cents ?? 0, data.currency ?? "usd", data.livemode ?? true],
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

  async findByAgency(agencyId: string, livemode?: boolean): Promise<PaymentRow[]> {
    if (livemode == null) {
      return query<PaymentRow>(
        "SELECT * FROM app.payments WHERE agency_id = $1 ORDER BY created_at DESC",
        [agencyId],
      );
    }
    return query<PaymentRow>(
      "SELECT * FROM app.payments WHERE agency_id = $1 AND livemode = $2 ORDER BY created_at DESC",
      [agencyId, livemode],
    );
  }

  async findByAgent(agentId: string, livemode?: boolean): Promise<PaymentRow[]> {
    if (livemode == null) {
      return query<PaymentRow>(
        "SELECT * FROM app.payments WHERE agent_id = $1 ORDER BY created_at DESC",
        [agentId],
      );
    }
    return query<PaymentRow>(
      "SELECT * FROM app.payments WHERE agent_id = $1 AND livemode = $2 ORDER BY created_at DESC",
      [agentId, livemode],
    );
  }

  async listRecent(limit = 100, livemode?: boolean): Promise<PaymentRow[]> {
    const n = Math.max(1, Math.min(limit, 500));
    if (livemode == null) {
      return query<PaymentRow>(
        "SELECT * FROM app.payments ORDER BY created_at DESC LIMIT $1",
        [n],
      );
    }
    return query<PaymentRow>(
      "SELECT * FROM app.payments WHERE livemode = $1 ORDER BY created_at DESC LIMIT $2",
      [livemode, n],
    );
  }

  /** Stamp the Stripe mode on an existing row (webhook/reconcile confirm it). */
  async setLivemode(sessionId: string, livemode: boolean): Promise<void> {
    await queryOne<PaymentRow>(
      `UPDATE app.payments SET livemode = $2 WHERE stripe_session_id = $1 RETURNING *`,
      [sessionId, livemode],
    );
  }
}

export const payments = new PaymentRepository();
