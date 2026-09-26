import { BaseRepository } from "./base";
import { query } from "@/server/db";
import { allocationForAgent } from "./agency-wallets";
import type { PoolClient } from "pg";

export interface WalletEntryRow {
  id: string;
  agency_id: string;
  agent_id: string | null;
  type: string;
  amount_cents: number;
  currency: string;
  call_id: string | null;
  provider_reference: string | null;
  idempotency_key: string;
  created_at: string;
}

export class WalletEntryRepository extends BaseRepository<WalletEntryRow> {
  protected schema = "app";
  protected table = "wallet_entries";

  async findByAgency(agencyId: string): Promise<WalletEntryRow[]> {
    return query<WalletEntryRow>(
      "SELECT * FROM app.wallet_entries WHERE agency_id = $1 AND agent_id IS NULL ORDER BY created_at DESC",
      [agencyId],
    );
  }

  async findByAgent(agentId: string): Promise<WalletEntryRow[]> {
    return query<WalletEntryRow>(
      "SELECT * FROM app.wallet_entries WHERE agent_id = $1 ORDER BY created_at DESC",
      [agentId],
    );
  }

  async findById(id: string): Promise<WalletEntryRow> {
    return super.findById(id);
  }

  async create(data: {
    agency_id: string;
    agent_id?: string;
    type: string;
    amount_cents: number;
    currency?: string;
    call_id?: string;
    provider_reference?: string;
    idempotency_key: string;
  }, client?: PoolClient): Promise<WalletEntryRow> {
    return super.create(data, client);
  }

  async sumByAgency(agencyId: string): Promise<number> {
    const rows = await query<{ total: string }>(
      "SELECT COALESCE(SUM(amount_cents), 0) as total FROM app.wallet_entries WHERE agency_id = $1 AND agent_id IS NULL",
      [agencyId],
    );
    return parseInt(rows[0]?.total ?? "0", 10);
  }

  async sumByAgent(agentId: string): Promise<number> {
    const rows = await query<{ total: string }>(
      "SELECT COALESCE(SUM(amount_cents), 0) as total FROM app.wallet_entries WHERE agent_id = $1",
      [agentId],
    );
    return parseInt(rows[0]?.total ?? "0", 10);
  }

  /** Effective balance = personal ledger + agency-pool allocation (P1.4).
   * The allocation counts ONLY while the agency pool is enabled — matching
   * effectiveBalanceSql used by the router. Otherwise agents go online on
   * paper but never ring. */
  async sumEffectiveByAgent(agentId: string, client?: PoolClient): Promise<number> {
    const [rows, allocated, pool] = await Promise.all([
      query<{ total: string }>(
        "SELECT COALESCE(SUM(amount_cents), 0) as total FROM app.wallet_entries WHERE agent_id = $1",
        [agentId],
        client,
      ),
      allocationForAgent(agentId, client),
      query<{ enabled: boolean }>(
        `SELECT COALESCE(aw.enabled, false) AS enabled
           FROM app.agents a LEFT JOIN app.agency_wallets aw ON aw.agency_id = a.agency_id
          WHERE a.id = $1`,
        [agentId],
        client,
      ),
    ]);
    const enabled = pool[0]?.enabled === true;
    return parseInt(rows[0]?.total ?? "0", 10) + (enabled ? allocated : 0);
  }
}

export const walletEntries = new WalletEntryRepository();
