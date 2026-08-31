import { BaseRepository } from "./base";
import { query } from "@/server/db";

export interface FeatureRequestRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  votes: number;
  created_at: string;
  updated_at: string;
}

export class FeatureRequestRepository extends BaseRepository<FeatureRequestRow> {
  protected schema = "app";
  protected table = "feature_requests";

  async incrementVotes(id: string): Promise<FeatureRequestRow> {
    const rows = await query<FeatureRequestRow>(
      `UPDATE app.feature_requests SET votes = votes + 1, updated_at = now() WHERE id = $1 RETURNING *`,
      [id],
    );
    return rows[0];
  }
}

export const featureRequests = new FeatureRequestRepository();
