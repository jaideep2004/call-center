import { BaseRepository } from "./base";
import { queryOne, query } from "@/server/db";
import type { PoolClient } from "pg";

export interface MembershipRow {
  id: string;
  agency_id: string;
  user_id: string;
  role: string;
  status: string;
}

export class MembershipRepository extends BaseRepository<MembershipRow> {
  protected schema = "app";
  protected table = "memberships";

  async findByUserAndAgency(userId: string, agencyId: string): Promise<MembershipRow | null> {
    return queryOne<MembershipRow>(
      "SELECT * FROM app.memberships WHERE user_id = $1 AND agency_id = $2",
      [userId, agencyId],
    );
  }

  async findById(id: string, agencyId?: string, client?: PoolClient): Promise<MembershipRow> {
    return super.findById(id, agencyId, client);
  }

  async findByUser(userId: string): Promise<MembershipRow[]> {
    return query<MembershipRow>(
      "SELECT * FROM app.memberships WHERE user_id = $1",
      [userId],
    );
  }

  async create(data: {
    agency_id: string;
    user_id: string;
    role: string;
  }): Promise<MembershipRow> {
    return super.create(data);
  }

  async updateRole(id: string, role: string): Promise<MembershipRow> {
    return super.update(id, { role });
  }

  async updateStatus(id: string, status: string): Promise<MembershipRow> {
    return super.update(id, { status });
  }
}

export const memberships = new MembershipRepository();
