import { BaseRepository } from "./base";
import { query, queryOne } from "@/server/db";
import type { PoolClient } from "pg";

export interface PhoneNumberRow {
  id: string;
  agency_id: string;
  /** Null = spare pool inventory, matches no campaign (0051). */
  campaign_id: string | null;
  provider: string;
  e164: string;
  status: string;
}

export class PhoneNumberRepository extends BaseRepository<PhoneNumberRow> {
  protected schema = "app";
  protected table = "phone_numbers";

  async findByE164(e164: string, client?: PoolClient): Promise<PhoneNumberRow | null> {
    return queryOne<PhoneNumberRow>(
      "SELECT * FROM app.phone_numbers WHERE e164 = $1 AND status = 'active'",
      [e164],
      client,
    );
  }

  async findByCampaign(campaignId: string, client?: PoolClient): Promise<PhoneNumberRow | null> {
    return queryOne<PhoneNumberRow>(
      "SELECT * FROM app.phone_numbers WHERE campaign_id = $1 AND status = 'active' LIMIT 1",
      [campaignId],
      client,
    );
  }

  /** Every number on a campaign (for the per-campaign manager). Agency scope optional (admin = all). */
  async findAllByCampaign(campaignId: string, agencyId?: string): Promise<PhoneNumberRow[]> {
    return query<PhoneNumberRow>(
      `SELECT * FROM app.phone_numbers WHERE campaign_id = $1${agencyId ? " AND agency_id = $2" : ""}
       ORDER BY e164 ASC`,
      agencyId ? [campaignId, agencyId] : [campaignId],
    );
  }

  async findById(id: string, agencyId?: string, client?: PoolClient): Promise<PhoneNumberRow> {
    return super.findById(id, agencyId, client);
  }

  async findByAgency(agencyId: string): Promise<PhoneNumberRow[]> {
    const { rows } = await super.findMany({
      filters: { agency_id: agencyId },
      sortBy: "e164",
      order: "asc",
      pagination: { page: 1, limit: 1000 },
    });
    return rows;
  }

  /** Platform view (admin): every agency's numbers, agency name joined. */
  async findAll(): Promise<Array<PhoneNumberRow & { agency_name: string | null }>> {
    const { rows } = await super.findMany({
      sortBy: "e164",
      order: "asc",
      pagination: { page: 1, limit: 1000 },
    });
    if (rows.length === 0) return [];
    const agencyIds = [...new Set(rows.map((r) => r.agency_id))];
    const names = await query<{ id: string; name: string }>(
      `SELECT id, name FROM app.agencies WHERE id = ANY($1::uuid[])`,
      [agencyIds],
    );
    const byId = new Map(names.map((a) => [a.id, a.name]));
    return rows.map((r) => ({ ...r, agency_name: byId.get(r.agency_id) ?? null }));
  }

  /** Move a number between campaigns, or null to park it as spare inventory. */
  async reassign(id: string, campaignId: string | null, agencyId: string, client?: PoolClient): Promise<PhoneNumberRow> {
    return super.update(id, { campaign_id: campaignId }, agencyId, client);
  }
}

export const phoneNumbers = new PhoneNumberRepository();
