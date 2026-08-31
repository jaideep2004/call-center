import { BaseRepository } from "./base";
import { query } from "@/server/db";

export interface SkillRow {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  sort: number;
  created_at: string;
}

export class SkillRepository extends BaseRepository<SkillRow> {
  protected schema = "app";
  protected table = "skills";

  async findAll(): Promise<SkillRow[]> {
    return query<SkillRow>(
      `SELECT * FROM app.skills WHERE deleted_at IS NULL ORDER BY sort ASC, name ASC`,
    );
  }

  async findActive(): Promise<SkillRow[]> {
    return query<SkillRow>(
      `SELECT * FROM app.skills WHERE deleted_at IS NULL AND active = true ORDER BY sort ASC, name ASC`,
    );
  }

  async findNames(): Promise<string[]> {
    const rows = await this.findActive();
    return rows.map((r) => r.name);
  }
}

export const skills = new SkillRepository();
