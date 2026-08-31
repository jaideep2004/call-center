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
    publisher_id?: string | null;
    status?: string;
  }): Promise<CampaignRow> {
    return super.create({
      agency_id: data.agency_id,
      name: data.name,
      routing_strategy: data.routing_strategy,
      price_cents: data.price_cents ?? null,
      min_connected_seconds: data.min_connected_seconds ?? 0,
      publisher_id: data.publisher_id ?? null,
      ...(data.status ? { status: data.status } : {}),
    });
  }

  async findByRetreaverCid(cid: string): Promise<CampaignRow | null> {
    const rows = await query<CampaignRow>(
      `SELECT * FROM app.campaigns WHERE retreaver_cid = $1 LIMIT 1`,
      [cid],
    );
    return rows[0] ?? null;
  }

  async findByPublisher(publisherId: string): Promise<CampaignRow[]> {
    return query<CampaignRow>(
      `SELECT * FROM app.campaigns WHERE publisher_id = $1 ORDER BY created_at ASC`,
      [publisherId],
    );
  }

  async linkRetreaverCid(id: string, cid: string | null): Promise<CampaignRow> {
    return this.update(id, { retreaver_cid: cid });
  }
}

export const campaigns = new CampaignRepository();
