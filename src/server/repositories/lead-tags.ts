import { BaseRepository } from "./base";
import { query } from "@/server/db";

export interface LeadTagRow {
  id: string;
  agency_id: string;
  lead_id: string;
  tag: string;
  created_at: string;
}

export class LeadTagRepository extends BaseRepository<LeadTagRow> {
  protected schema = "app";
  protected table = "lead_tags";

  async findByLead(leadId: string): Promise<string[]> {
    const rows = await query<{ tag: string }>(
      "SELECT tag FROM app.lead_tags WHERE lead_id = $1 ORDER BY tag ASC",
      [leadId],
    );
    return rows.map((r) => r.tag);
  }

  async addTag(agencyId: string, leadId: string, tag: string): Promise<void> {
    await query(
      "INSERT INTO app.lead_tags (agency_id, lead_id, tag) VALUES ($1, $2, $3) ON CONFLICT (lead_id, tag) DO NOTHING",
      [agencyId, leadId, tag.toLowerCase().trim()],
    );
  }

  async removeTag(leadId: string, tag: string): Promise<void> {
    await query("DELETE FROM app.lead_tags WHERE lead_id = $1 AND tag = $2", [leadId, tag]);
  }
}

export const leadTags = new LeadTagRepository();
