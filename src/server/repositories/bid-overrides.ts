import { queryOne } from "@/server/db";
import type { PoolClient } from "pg";

export interface BidOverrideRow {
  id: string;
  campaign_id: string;
  price_cents: number | null;
  payout_cents: number | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export class BidOverrideRepository {
  async findLatest(campaignId: string, client?: PoolClient): Promise<BidOverrideRow | null> {
    return queryOne<BidOverrideRow>(
      "SELECT * FROM app.bid_overrides WHERE campaign_id = $1",
      [campaignId],
      client,
    );
  }

  async upsert(
    campaignId: string,
    data: { price_cents?: number | null; payout_cents?: number | null; note?: string | null; createdBy?: string | null },
  ): Promise<BidOverrideRow> {
    const row = await queryOne<BidOverrideRow>(
      `INSERT INTO app.bid_overrides (campaign_id, price_cents, payout_cents, note, created_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (campaign_id) DO UPDATE SET
         price_cents = COALESCE(EXCLUDED.price_cents, app.bid_overrides.price_cents),
         payout_cents = COALESCE(EXCLUDED.payout_cents, app.bid_overrides.payout_cents),
         note = COALESCE(EXCLUDED.note, app.bid_overrides.note),
         created_by = EXCLUDED.created_by,
         updated_at = now()
       RETURNING *`,
      [campaignId, data.price_cents ?? null, data.payout_cents ?? null, data.note ?? null, data.createdBy ?? null],
    );
    return row!;
  }

  async clear(campaignId: string): Promise<void> {
    await queryOne(
      "DELETE FROM app.bid_overrides WHERE campaign_id = $1 RETURNING id",
      [campaignId],
    );
  }
}

export const bidOverrides = new BidOverrideRepository();
