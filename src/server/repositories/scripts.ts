import { BaseRepository } from "./base";
import { query, queryOne } from "@/server/db";
import { NotFoundError } from "@/server/errors";

export interface ScriptRow {
  id: string;
  /** Owning agency; NULL = global script visible to every agency (0074). */
  agency_id: string | null;
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
    agencyId?: string,
  ): Promise<ScriptRow> {
    return super.update(id, { ...data, updated_at: new Date().toISOString() }, agencyId);
  }

  /**
   * Detail/edit/delete lookup: own-agency rows plus global (NULL) rows.
   * A plain agency-scoped findById can never match a global row, so without
   * this every global script 404s on open.
   */
  async findByIdInclusive(id: string, agencyId?: string | null): Promise<ScriptRow> {
    const row = await queryOne<ScriptRow>(
      `SELECT * FROM app.scripts
        WHERE id = $1 AND (agency_id = $2 OR agency_id IS NULL) AND deleted_at IS NULL`,
      [id, agencyId ?? null],
    );
    if (!row) throw new NotFoundError("script not found");
    return row;
  }
}

export const scripts = new ScriptRepository();
