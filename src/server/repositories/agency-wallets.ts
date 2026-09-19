import { query, queryOne } from "@/server/db";
import type { PoolClient } from "pg";

export interface AgencyWalletRow {
  agency_id: string;
  balance_cents: number;
  enabled: boolean;
  updated_at: string;
}

export interface AllocationRow {
  id: string;
  agency_id: string;
  agent_id: string;
  allocated_cents: number;
  updated_at: string;
}

/**
 * SQL expression for an agent's EFFECTIVE balance (personal ledger +
 * agency-pool allocation). `agentAlias` is the agents-table alias in the
 * outer query (e.g. "a"). Allocation counts only while the agency pool is
 * enabled; both subqueries are index-backed (wallet_entries.agent_id,
 * allocations.agent_id) for hot-path use in ping/route/eligibility gates.
 */
export function effectiveBalanceSql(agentAlias = "a"): string {
  return `(
    (SELECT COALESCE(SUM(we.amount_cents), 0) FROM app.wallet_entries we WHERE we.agent_id = ${agentAlias}.id)
    + CASE
        WHEN (SELECT COALESCE(aw.enabled, false) FROM app.agency_wallets aw WHERE aw.agency_id = ${agentAlias}.agency_id) THEN
          COALESCE((SELECT awa.allocated_cents FROM app.agency_wallet_allocations awa WHERE awa.agent_id = ${agentAlias}.id), 0)
        ELSE 0
      END
  )`;
}

async function getOrCreatePool(agencyId: string, client?: PoolClient): Promise<AgencyWalletRow> {
  const existing = await queryOne<AgencyWalletRow>(
    `SELECT * FROM app.agency_wallets WHERE agency_id = $1`,
    [agencyId],
    client,
  );
  if (existing) return existing;
  const rows = await query<AgencyWalletRow>(
    `INSERT INTO app.agency_wallets (agency_id, balance_cents, enabled)
     VALUES ($1, 0, false)
     ON CONFLICT (agency_id) DO NOTHING
     RETURNING *`,
    [agencyId],
    client,
  );
  if (rows[0]) return rows[0];
  return (await queryOne<AgencyWalletRow>(
    `SELECT * FROM app.agency_wallets WHERE agency_id = $1`,
    [agencyId],
    client,
  ))!;
}

export async function getPool(agencyId: string, client?: PoolClient): Promise<AgencyWalletRow> {
  return getOrCreatePool(agencyId, client);
}

export async function setPoolEnabled(
  agencyId: string,
  enabled: boolean,
  client?: PoolClient,
): Promise<AgencyWalletRow> {
  await getOrCreatePool(agencyId, client);
  const row = await queryOne<AgencyWalletRow>(
    `UPDATE app.agency_wallets SET enabled = $2, updated_at = now()
     WHERE agency_id = $1 RETURNING *`,
    [agencyId, enabled],
    client,
  );
  return row!;
}

/** Credit the pool (Stripe webhook only — never mints, only adds paid amounts). */
export async function creditPool(
  agencyId: string,
  amountCents: number,
  client?: PoolClient,
): Promise<AgencyWalletRow> {
  await getOrCreatePool(agencyId, client);
  const row = await queryOne<AgencyWalletRow>(
    `UPDATE app.agency_wallets SET balance_cents = balance_cents + $2, updated_at = now()
     WHERE agency_id = $1 RETURNING *`,
    [agencyId, amountCents],
    client,
  );
  return row!;
}

export async function listAllocations(
  agencyId: string,
  client?: PoolClient,
): Promise<(AllocationRow & { agent_display?: string | null })[]> {
  return query(
    `SELECT awa.*, a.display_code AS agent_display
       FROM app.agency_wallet_allocations awa
       JOIN app.agents a ON a.id = awa.agent_id
      WHERE awa.agency_id = $1
      ORDER BY awa.updated_at DESC`,
    [agencyId],
    client,
  );
}

export async function sumAllocated(agencyId: string, client?: PoolClient): Promise<number> {
  const rows = await query<{ total: string }>(
    `SELECT COALESCE(SUM(allocated_cents), 0)::text AS total
       FROM app.agency_wallet_allocations WHERE agency_id = $1`,
    [agencyId],
    client,
  );
  return parseInt(rows[0]?.total ?? "0", 10);
}

export async function allocationForAgent(
  agentId: string,
  client?: PoolClient,
): Promise<number> {
  const rows = await query<{ allocated_cents: number }>(
    `SELECT allocated_cents FROM app.agency_wallet_allocations WHERE agent_id = $1`,
    [agentId],
    client,
  );
  return rows.reduce((sum, r) => sum + (r.allocated_cents ?? 0), 0);
}

/** Upsert one agent's allocation (head-only route validates agency + cap). */
export async function setAllocation(
  agencyId: string,
  agentId: string,
  allocatedCents: number,
  client?: PoolClient,
): Promise<AllocationRow> {
  const rows = await query<AllocationRow>(
    `INSERT INTO app.agency_wallet_allocations (agency_id, agent_id, allocated_cents, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (agency_id, agent_id)
     DO UPDATE SET allocated_cents = EXCLUDED.allocated_cents, updated_at = now()
     RETURNING *`,
    [agencyId, agentId, allocatedCents],
    client,
  );
  return rows[0]!;
}

export const agencyWallets = {
  getPool,
  setPoolEnabled,
  creditPool,
  listAllocations,
  sumAllocated,
  allocationForAgent,
  setAllocation,
};
