import { BaseRepository } from "./base";
import { query } from "@/server/db";
import type { PoolClient } from "pg";

export interface AgentSubscriptionRow {
  id: string;
  agent_id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
  calls_used: number;
  created_at: string;
  updated_at: string;
}

export class AgentSubscriptionRepository extends BaseRepository<AgentSubscriptionRow> {
  protected schema = "app";
  protected table = "agent_subscriptions";

  async findByAgent(agentId: string): Promise<AgentSubscriptionRow[]> {
    return query<AgentSubscriptionRow>(
      "SELECT * FROM app.agent_subscriptions WHERE agent_id = $1 ORDER BY created_at DESC",
      [agentId],
    );
  }

  async findActiveByAgent(agentId: string): Promise<AgentSubscriptionRow | null> {
    const rows = await query<AgentSubscriptionRow>(
      `SELECT * FROM app.agent_subscriptions
       WHERE agent_id = $1 AND status = 'active'
         AND (end_date IS NULL OR end_date > now())
         AND calls_used < (SELECT call_allowance FROM app.agent_plans WHERE id = plan_id)
       ORDER BY created_at DESC LIMIT 1`,
      [agentId],
    );
    return rows[0] ?? null;
  }

  /**
   * Retire `active` rows the finder no longer counts (past end_date or
   * allowance exhausted). Without this, the 0029 partial unique index keeps
   * rejecting re-subscribes that findActiveByAgent says are free — a
   * permanent 500/409 lockout. Returns the retired ids.
   */
  async expireStaleByAgent(agentId: string, client?: PoolClient): Promise<string[]> {
    const rows = await query<{ id: string }>(
      `UPDATE app.agent_subscriptions s SET status = 'expired', updated_at = now()
        WHERE s.agent_id = $1 AND s.status = 'active'
          AND ((s.end_date IS NOT NULL AND s.end_date <= now())
            OR s.calls_used >= (SELECT call_allowance FROM app.agent_plans WHERE id = s.plan_id))
        RETURNING s.id`,
      [agentId],
      client,
    );
    return rows.map((r) => r.id);
  }

  /**
   * Increments calls_used by one for the given call. Idempotent at the SQL
   * level via app.subscription_call_charges (UNIQUE on subscription_id+call_id).
   * If a row already exists for this (subscription, call) pair, the calls_used
   * counter is NOT incremented again. Safe to call twice for the same call.
   *
   * callId is required and must reference a real call.
   */
  async incrementCallsUsed(id: string, callId: string, client?: PoolClient): Promise<void> {
    // 1) Attempt to record the per-call usage. ON CONFLICT DO NOTHING means
    //    a duplicate (subscription_id, call_id) is a silent no-op.
    // 2) Only if the row was actually inserted do we bump the counter, so
    //    concurrent finalize+redeliver cannot double-decrement calls_used.
    const inserted = await query<{ id: string }>(
      `INSERT INTO app.subscription_call_charges (subscription_id, call_id)
       VALUES ($1, $2)
       ON CONFLICT (subscription_id, call_id) DO NOTHING
       RETURNING id`,
      [id, callId],
      client,
    );
    if (inserted.length === 0) return; // already counted for this call
    await query(
      "UPDATE app.agent_subscriptions SET calls_used = calls_used + 1, updated_at = now() WHERE id = $1",
      [id],
      client,
    );
  }
}

export const agentSubscriptions = new AgentSubscriptionRepository();
