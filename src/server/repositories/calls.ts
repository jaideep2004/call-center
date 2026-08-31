import { BaseRepository, FindManyParams } from "./base";
import { queryOne } from "@/server/db";
import type { PoolClient } from "pg";

export interface CallRow {
  id: string;
  agency_id: string;
  campaign_id: string;
  agent_id: string | null;
  provider: string;
  provider_call_id: string;
  provider_agent_call_id: string | null;
  state: string;
  from_hash: string | null;
  to_number: string | null;
  caller_state: string | null;
  ring_started_at: string | null;
  retreaver_call_id: string | null;
  started_at: string | null;
  connected_at: string | null;
  ended_at: string | null;
  routing_snapshot: Record<string, unknown>;
  qualification_snapshot: Record<string, unknown>;
}

export class CallRepository extends BaseRepository<CallRow> {
  protected schema = "app";
  protected table = "calls";

  async findById(id: string, agencyId?: string, client?: PoolClient): Promise<CallRow> {
    return super.findById(id, agencyId, client);
  }

  async findByProviderCallId(provider: string, providerCallId: string, client?: PoolClient): Promise<CallRow | null> {
    return queryOne<CallRow>(
      "SELECT * FROM app.calls WHERE provider = $1 AND provider_call_id = $2",
      [provider, providerCallId],
      client,
    );
  }

  async findByProviderAgentCallId(provider: string, providerAgentCallId: string, client?: PoolClient): Promise<CallRow | null> {
    return queryOne<CallRow>(
      "SELECT * FROM app.calls WHERE provider = $1 AND provider_agent_call_id = $2",
      [provider, providerAgentCallId],
      client,
    );
  }

  async findMany(params: FindManyParams & { agencyId?: string; state?: string } = {}) {
    const { sortBy, order, ...rest } = params;
    return super.findMany({
      ...rest,
      sortBy: sortBy ?? "started_at",
      order,
      filters: {
        ...(params.agencyId ? { agency_id: params.agencyId } : {}),
        ...(params.state ? { state: params.state } : {}),
        ...params.filters,
      },
    });
  }

  async create(data: {
    agency_id: string;
    campaign_id: string;
    provider: string;
    provider_call_id: string;
  }, client?: PoolClient): Promise<CallRow> {
    return super.create(data, client);
  }

  async updateState(id: string, state: string, agencyId: string, extra?: Record<string, unknown>, client?: PoolClient): Promise<CallRow> {
    return super.update(id, { state, ...extra }, agencyId, client);
  }

  /**
   * Atomic state claim: `UPDATE ... SET <cols> WHERE id = $1 AND state = $2 AND agency_id = ... RETURNING *`.
   * Returns the row when the call was still in `fromState` (the claim won),
   * or null when another actor already moved it (duplicate job, overlapping
   * failover, webhook race). This is the idempotency primitive for dialing
   * and failover: only the claim winner may dial/cancel.
   */
  async claimState(
    id: string,
    fromState: string,
    toState: string,
    agencyId: string,
    extra?: Record<string, unknown>,
    client?: PoolClient,
  ): Promise<CallRow | null> {
    const setCols: string[] = ["state = $3"];
    const params: unknown[] = [id, fromState, toState];
    for (const [key, value] of Object.entries(extra ?? {})) {
      params.push(value);
      setCols.push(`${key} = $${params.length}`);
    }
    params.push(agencyId);
    return queryOne<CallRow>(
      `UPDATE app.calls SET ${setCols.join(", ")}
       WHERE id = $1 AND state = $2 AND agency_id = $${params.length}
       RETURNING *`,
      params,
      client,
    );
  }
}

export const calls = new CallRepository();
