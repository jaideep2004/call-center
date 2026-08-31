import { BaseRepository } from "./base";
import { queryOne } from "@/server/db";
import type { PoolClient } from "pg";

export interface PhoneNumberRow {
  id: string;
  agency_id: string;
  campaign_id: string;
  provider: string;
  e164: string;
  status: string;
}

export class PhoneNumberRepository extends BaseRepository<PhoneNumberRow> {
  protected schema = "app";
  protected table = "phone_numbers";

  async findByE164(e164: string, client?: PoolClient): Promise<PhoneNumberRow | null> {
    return queryOne<PhoneNumberRow>(
      "SELECT * FROM app.phone_numbers WHERE e164 = $1",
      [e164],
      client,
    );
  }

  async findByCampaign(campaignId: string, client?: PoolClient): Promise<PhoneNumberRow | null> {
    return queryOne<PhoneNumberRow>(
      "SELECT * FROM app.phone_numbers WHERE campaign_id = $1 LIMIT 1",
      [campaignId],
      client,
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
}

export const phoneNumbers = new PhoneNumberRepository();
