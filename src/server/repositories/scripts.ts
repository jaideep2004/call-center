import { BaseRepository } from "./base";
import { query } from "@/server/db";

export interface ScriptRow {
  id: string;
  agency_id: string;
  campaign_id: string | null;
  title: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export class ScriptRepository extends BaseRepository<ScriptRow> {
  protected schema = "app";
  protected table = "scripts";

  async findByAgency(agencyId: string): Promise<ScriptRow[]> {
    const { rows } = await super.findMany({
      filters: { agency_id: agencyId },
      sortBy: "created_at",
      order: "desc",
    });
    return rows;
  }

  async findScriptsForCampaign(agencyId: string, campaignId: string): Promise<ScriptRow[]> {
    const { rows } = await super.findMany({
      filters: { agency_id: agencyId, campaign_id: campaignId },
      sortBy: "created_at",
      order: "desc",
    });
    return rows;
  }

  async findUnbound(agencyId: string): Promise<ScriptRow[]> {
    return query<ScriptRow>(
      `SELECT * FROM app.scripts WHERE agency_id = $1 AND campaign_id IS NULL ORDER BY created_at DESC`,
      [agencyId],
    );
  }

  async create(data: {
    agency_id: string;
    title: string;
    content: string;
    category?: string;
    tags?: string[];
    campaign_id?: string | null;
  }): Promise<ScriptRow> {
    return super.create(data);
  }

  async update(
    id: string,
    data: { title?: string; content?: string; category?: string; tags?: string[]; campaign_id?: string | null },
    agencyId: string,
  ): Promise<ScriptRow> {
    return super.update(id, { ...data, updated_at: new Date().toISOString() }, agencyId);
  }
}

export const scripts = new ScriptRepository();
