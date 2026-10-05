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
  protected skipDeleted = true;

  /** Agency list = own agency + global (NULL) rows, newest first. */
  async findByAgency(agencyId: string): Promise<ScriptRow[]> {
    return query<ScriptRow>(
      `SELECT * FROM app.scripts
        WHERE (agency_id = $1 OR agency_id IS NULL) AND deleted_at IS NULL
        ORDER BY created_at DESC`,
      [agencyId],
    );
  }

  async findScriptsForCampaign(agencyId: string, campaignId: string): Promise<ScriptRow[]> {
    const { rows } = await super.findMany({
      filters: { agency_id: agencyId, campaign_id: campaignId },
      sortBy: "created_at",
      order: "desc",
    });
    return rows;
  }

  /** Platform-global unbound library (admin-authored, agency_id NULL). */
  async findGlobalUnbound(): Promise<ScriptRow[]> {
    return query<ScriptRow>(
      `SELECT * FROM app.scripts
        WHERE agency_id IS NULL AND campaign_id IS NULL AND deleted_at IS NULL
        ORDER BY created_at DESC`,
      [],
    );
  }

  async findUnbound(agencyId: string): Promise<ScriptRow[]> {
    return query<ScriptRow>(
      `SELECT * FROM app.scripts
        WHERE (agency_id = $1 OR agency_id IS NULL) AND campaign_id IS NULL AND deleted_at IS NULL
        ORDER BY created_at DESC`,
      [agencyId],
    );
  }

  async create(data: {
    agency_id: string | null;
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
