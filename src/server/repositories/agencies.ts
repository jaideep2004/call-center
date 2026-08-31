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
  created_at: string;
}

export class AgencyRepository extends BaseRepository<AgencyRow> {
  protected schema = "app";
  protected table = "agencies";

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

export const agencies = new AgencyRepository();
