import { BaseRepository } from "./base";
import { query, queryOne, transaction } from "@/server/db";
import { walletEntries } from "./wallet-entries";
import { assertSpendableBalance } from "@/domain/ledger";
import type { PoolClient } from "pg";

export interface WalletTransferRow {
  id: string;
  from_membership_id: string;
  from_agency_id: string;
  to_agent_id: string;
  amount_cents: number;
  reason: string | null;
  created_at: string;
}

export class WalletTransferRepository extends BaseRepository<WalletTransferRow> {
  protected schema = "app";
  protected table = "wallet_transfers";

  async findByAgency(agencyId: string): Promise<WalletTransferRow[]> {
    return query<WalletTransferRow>(
      "SELECT * FROM app.wallet_transfers WHERE from_agency_id = $1 ORDER BY created_at DESC",
      [agencyId],
    );
  }

  async findByAgent(agentId: string): Promise<WalletTransferRow[]> {
    return query<WalletTransferRow>(
      "SELECT * FROM app.wallet_transfers WHERE to_agent_id = $1 ORDER BY created_at DESC",
      [agentId],
    );
  }

  async transferToAgent(data: {
    fromMembershipId: string;
    fromAgencyId: string;
    toAgentId: string;
    amountCents: number;
    reason?: string;
  }): Promise<WalletTransferRow> {
    const { fromMembershipId, fromAgencyId, toAgentId, amountCents, reason } = data;

    return transaction(async (client) => {
      const agent = await queryOne<{ id: string; agency_id: string }>(
        "SELECT id, agency_id FROM app.agents WHERE id = $1",
        [toAgentId],
        client,
      );
      if (!agent) throw new Error("Agent not found");
      if (agent.agency_id !== fromAgencyId) throw new Error("Agent does not belong to this agency");

      const agencyEntries = await query<{ amount_cents: number }>(
        "SELECT amount_cents FROM app.wallet_entries WHERE agency_id = $1 AND agent_id IS NULL",
        [fromAgencyId],
        client,
      );
      assertSpendableBalance(
        agencyEntries.map((e) => ({ id: "", type: "charge", amountCents: e.amount_cents, reference: "" })),
        amountCents,
      );

      const transfer = await queryOne<WalletTransferRow>(
        `INSERT INTO app.wallet_transfers
          (from_membership_id, from_agency_id, to_agent_id, amount_cents, reason)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [fromMembershipId, fromAgencyId, toAgentId, amountCents, reason ?? null],
        client,
      );

      await walletEntries.create(
        {
          agency_id: fromAgencyId,
          type: "transfer",
          amount_cents: -amountCents,
          idempotency_key: `transfer_${transfer!.id}_out`,
        },
        client,
      );
      await walletEntries.create(
        {
          agency_id: fromAgencyId,
          agent_id: toAgentId,
          type: "transfer",
          amount_cents: amountCents,
          idempotency_key: `transfer_${transfer!.id}_in`,
        },
        client,
      );

      return transfer!;
    });
  }
}

export const walletTransfers = new WalletTransferRepository();
