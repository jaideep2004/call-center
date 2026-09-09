import { BaseRepository, FindManyParams } from "./base";
import { query } from "@/server/db";
import type { PoolClient } from "pg";

export interface CampaignRow {
  id: string;
  agency_id: string;
  name: string;
  status: string;
  routing_strategy: string;
  price_cents: number | null;
  min_connected_seconds: number;
  buffer_seconds: number;
  allowed_endpoints: string[];
  target_states: string[];
  target_zip_prefixes: string[];
  required_license: string | null;
  required_skills: string[];
  record_calls: boolean;
  consent_policy: Record<string, unknown>;
  ring_timeout_seconds: number;
  max_ring_attempts: number;
  publisher_id: string | null;
  rtb_enabled: boolean;
  rtb_postback_key_encrypted: string | null;
  retreaver_cid: string | null;
}

/** Row returned by findManyWithBid — adds the effective price (override wins). */
export interface CampaignWithBidRow extends CampaignRow {
  effective_price_cents: number | null;
  effective_payout_cents: number | null;
  has_bid_override: boolean;
}

export class CampaignRepository extends BaseRepository<CampaignRow> {
  protected schema = "app";
  protected table = "campaigns";

  async findById(id: string, agencyId?: string, client?: PoolClient): Promise<CampaignRow> {
    return super.findById(id, agencyId, client);
  }

  async findMany(params: FindManyParams & { agencyId?: string; status?: string } = {}) {
    return super.findMany({
      ...params,
      filters: {
        ...(params.agencyId ? { agency_id: params.agencyId } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...params.filters,
      },
    });
  }

  async create(data: {
    agency_id: string;
    name: string;
    routing_strategy: string;
    price_cents?: number | null;
    min_connected_seconds?: number;
    buffer_seconds?: number;
    record_calls?: boolean;
    allowed_endpoints?: string[];
    required_skills?: string[];
    publisher_id?: string | null;
    publisher_ids?: string[] | null;
    retreaver_cid?: string | null;
    status?: string;
  }): Promise<CampaignRow> {
    const publisherIds = data.publisher_ids ?? (data.publisher_id ? [data.publisher_id] : []);
    const legacy = publisherIds[0] ?? data.publisher_id ?? null;
    const row = await super.create({
      agency_id: data.agency_id,
      name: data.name,
      routing_strategy: data.routing_strategy,
      price_cents: data.price_cents ?? null,
      min_connected_seconds: data.min_connected_seconds ?? 60,
      buffer_seconds: data.buffer_seconds ?? 30,
      record_calls: data.record_calls ?? true,
      allowed_endpoints: data.allowed_endpoints ?? ["webrtc", "pstn"],
      required_skills: data.required_skills ?? [],
      retreaver_cid: data.retreaver_cid ?? null,
      publisher_id: legacy,
      ...(data.status ? { status: data.status } : {}),
    });
    if (publisherIds.length > 0) {
      await this.setPublisherIds(row.id, publisherIds);
    }
    return this.findById(row.id);
  }

  async findByRetreaverCid(cid: string): Promise<CampaignRow | null> {
    const rows = await query<CampaignRow>(
      `SELECT * FROM app.campaigns WHERE retreaver_cid = $1 LIMIT 1`,
      [cid],
    );
    return rows[0] ?? null;
  }

  async findByPublisher(publisherId: string): Promise<CampaignRow[]> {
    // Use join table (multi-select) with fallback to legacy publisher_id for old rows not yet backfilled
    return query<CampaignRow>(
      `SELECT c.* FROM app.campaigns c
       LEFT JOIN app.campaign_publishers cp ON cp.campaign_id = c.id
       WHERE c.publisher_id = $1 OR cp.publisher_id = $1
       GROUP BY c.id ORDER BY c.created_at ASC`,
      [publisherId],
    );
  }

  async getPublisherIds(campaignId: string): Promise<string[]> {
    const rows = await query<{ publisher_id: string }>(
      `SELECT publisher_id FROM app.campaign_publishers WHERE campaign_id = $1 ORDER BY created_at ASC`,
      [campaignId],
    );
    return rows.map((r) => r.publisher_id);
  }

  async setPublisherIds(campaignId: string, publisherIds: string[], client?: import("pg").PoolClient): Promise<string[]> {
    const uniq = [...new Set(publisherIds.filter(Boolean))];
    // keep legacy column in sync (first publisher or null) for old code paths
    const legacy = uniq[0] ?? null;
    const q = (text: string, params: unknown[]) => (client ? query(text, params, client) : query(text, params));
    // update legacy column
    await q(`UPDATE app.campaigns SET publisher_id = $2 WHERE id = $1`, [campaignId, legacy]);
    // replace join rows
    await q(`DELETE FROM app.campaign_publishers WHERE campaign_id = $1`, [campaignId]);
    for (const pid of uniq) {
      await q(`INSERT INTO app.campaign_publishers (campaign_id, publisher_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [campaignId, pid]);
    }
    return uniq;
  }

  /**
   * List campaigns joined to the latest bid_override for each, exposing
   * effective_price_cents (override wins) and effective_payout_cents so
   * the dashboard shows what callers actually pay/get paid without a
   * separate per-row GET. Excludes soft-deleted rows.
   *
   * search + sortBy + order: same semantics as findMany. status filter
   * is supported. agencyId is supported.
   */
  async findManyWithBid(params: {
    agencyId?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    order?: "asc" | "desc";
    limit: number;
    offset: number;
  }): Promise<{ rows: CampaignWithBidRow[]; total: number }> {
    const where: string[] = ["c.deleted_at IS NULL"];
    const queryParams: unknown[] = [];
    let i = 1;
    if (params.agencyId) {
      where.push(`c.agency_id = $${i++}`);
      queryParams.push(params.agencyId);
    }
    if (params.status) {
      where.push(`c.status = $${i++}`);
      queryParams.push(params.status);
    }
    if (params.search) {
      where.push(`c.name ILIKE $${i++}`);
      queryParams.push(`%${params.search}%`);
    }
    const whereClause = `WHERE ${where.join(" AND ")}`;

    const sortMap: Record<string, string> = {
      name: "c.name",
      status: "c.status",
      price_cents: "c.price_cents",
      created_at: "c.created_at",
      updated_at: "c.updated_at",
    };
    const col = sortMap[params.sortBy ?? ""] ?? "c.created_at";
    const dir = params.order === "asc" ? "ASC" : "DESC";

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM app.campaigns c ${whereClause}`,
      queryParams,
    );
    const total = parseInt(countResult[0]?.count ?? "0", 10);

    const rows = await query<CampaignWithBidRow>(
      `SELECT
         c.*,
         COALESCE(bo.price_cents,  c.price_cents)  AS effective_price_cents,
         COALESCE(bo.payout_cents, NULL)            AS effective_payout_cents,
         (bo.campaign_id IS NOT NULL)               AS has_bid_override
       FROM app.campaigns c
       LEFT JOIN app.bid_overrides bo ON bo.campaign_id = c.id
       ${whereClause}
       ORDER BY ${col} ${dir}
       LIMIT $${i++} OFFSET $${i++}`,
      [...queryParams, params.limit, params.offset],
    );
    return { rows, total };
  }

  async linkRetreaverCid(id: string, cid: string | null): Promise<CampaignRow> {
    return this.update(id, { retreaver_cid: cid });
  }
}

export const campaigns = new CampaignRepository();
