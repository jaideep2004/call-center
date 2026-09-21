import { BaseRepository, FindManyParams } from "./base";
import { queryOne, query } from "@/server/db";
import type { PoolClient } from "pg";

export interface AgencyRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency: string;
  recording_retention_days: number;
  parent_agency_id: string | null;
  commission_rate: number;
  head_membership_id: string | null;
  /** Human-readable serial (AC-NNNN, DB default). UUID stays the PK. */
  display_code: string | null;
  created_at: string;
}

export class AgencyRepository extends BaseRepository<AgencyRow> {
  protected schema = "app";
  protected table = "agencies";
  protected skipDeleted = true;

  async findBySlug(slug: string): Promise<AgencyRow | null> {
    return queryOne<AgencyRow>(
      "SELECT * FROM app.agencies WHERE slug = $1",
      [slug],
    );
  }

  async findById(id: string): Promise<AgencyRow> {
    return super.findById(id);
  }

  async findMany(params: FindManyParams & { status?: string } = {}) {
    return super.findMany({
      ...params,
      filters: { status: params.status, ...params.filters },
    });
  }

  async create(data: { name: string; slug: string; parent_agency_id?: string; commission_rate?: number }, client?: PoolClient): Promise<AgencyRow> {
    return super.create({
      name: data.name,
      slug: data.slug,
      parent_agency_id: data.parent_agency_id ?? null,
      commission_rate: data.commission_rate ?? 0,
    }, client);
  }

  async update(id: string, data: Partial<AgencyRow>): Promise<AgencyRow> {
    return super.update(id, data);
  }
}

/** Whether the agency pool wallet is enabled (reads agency_wallets.enabled; false when no pool row). */
export async function agency_wallet_enabled(agencyId: string, client?: PoolClient): Promise<boolean> {
  const row = await queryOne<{ enabled: boolean }>(
    `SELECT enabled FROM app.agency_wallets WHERE agency_id = $1`,
    [agencyId],
    client,
  );
  return row?.enabled ?? false;
}

export const agencies = new AgencyRepository();
