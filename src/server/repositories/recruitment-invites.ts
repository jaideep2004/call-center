import { BaseRepository } from "./base";
import { query } from "@/server/db";

export interface RecruitmentInviteRow {
  id: string;
  inviter_membership_id: string;
  invitee_email: string;
  token: string;
  status: string;
  sub_agency_id: string | null;
  created_at: string;
  expires_at: string;
}

export class RecruitmentInviteRepository extends BaseRepository<RecruitmentInviteRow> {
  protected schema = "app";
  protected table = "recruitment_invites";

  async findByToken(token: string): Promise<RecruitmentInviteRow | null> {
    const rows = await query<RecruitmentInviteRow>(
      "SELECT * FROM app.recruitment_invites WHERE token = $1",
      [token],
    );
    return rows[0] ?? null;
  }

  async findByInviter(membershipId: string): Promise<RecruitmentInviteRow[]> {
    return query<RecruitmentInviteRow>(
      "SELECT * FROM app.recruitment_invites WHERE inviter_membership_id = $1 ORDER BY created_at DESC",
      [membershipId],
    );
  }

  async accept(token: string): Promise<RecruitmentInviteRow> {
    const rows = await query<RecruitmentInviteRow>(
      `UPDATE app.recruitment_invites SET status = 'accepted' WHERE token = $1 AND status = 'pending' AND expires_at > now() RETURNING *`,
      [token],
    );
    return rows[0];
  }
}

export const recruitmentInvites = new RecruitmentInviteRepository();
