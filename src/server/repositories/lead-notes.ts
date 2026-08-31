import { BaseRepository } from "./base";

export interface LeadNoteRow {
  id: string;
  agency_id: string;
  lead_id: string;
  content: string;
  author_membership_id: string | null;
  created_at: string;
}

export class LeadNoteRepository extends BaseRepository<LeadNoteRow> {
  protected schema = "app";
  protected table = "lead_notes";
}

export const leadNotes = new LeadNoteRepository();
