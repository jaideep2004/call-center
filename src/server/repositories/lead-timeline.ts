import { BaseRepository } from "./base";
import { query } from "@/server/db";

export interface LeadTimelineRow {
  id: string;
  agency_id: string;
  lead_id: string;
  actor_membership_id: string | null;
  type: string;
  body: Record<string, unknown>;
  created_at: string;
}

export class LeadTimelineRepository extends BaseRepository<LeadTimelineRow> {
  protected schema = "app";
  protected table = "lead_timeline";

  async findByLead(leadId: string): Promise<LeadTimelineRow[]> {
    return query<LeadTimelineRow>(
      "SELECT * FROM app.lead_timeline WHERE lead_id = $1 ORDER BY created_at DESC",
      [leadId],
    );
  }

  async create(data: {
    agency_id: string;
    lead_id: string;
    actor_membership_id?: string;
    type: string;
    body?: Record<string, unknown>;
  }): Promise<LeadTimelineRow> {
    return super.create(data);
  }
}

export const leadTimeline = new LeadTimelineRepository();
