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
   * Increments calls_used by one. NOT safe to call twice for the same call:
   * finalizeCall serializes every charge behind the per-call invoice insert
   * (idempotency anchor), so this only runs for the single finalize winner.
   * callId is kept for tracing/audit and for future call-level guards.
   */
  async incrementCallsUsed(id: string, callId: string, client?: PoolClient): Promise<void> {
    await query(
      "UPDATE app.agent_subscriptions SET calls_used = calls_used + 1, updated_at = now() WHERE id = $1",
      [id],
      client,
    );
  }
}

export const agentSubscriptions = new AgentSubscriptionRepository();
