import { BaseRepository } from "./base";
import { query } from "@/server/db";

export interface SkillRow {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  /** default = agent-visible verticals; exclusive = head/admin-only. */
  visibility: string;
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

  /** Agent-facing verticals: active + default visibility only. Exclusive
   * skills never reach agent pickers (or agent self-service validation). */
  async findDefaultActive(): Promise<SkillRow[]> {
    return query<SkillRow>(
      `SELECT * FROM app.skills WHERE deleted_at IS NULL AND active = true
         AND visibility = 'default' ORDER BY sort ASC, name ASC`,
    );
  }

  async findNames(options?: { includeExclusive?: boolean }): Promise<string[]> {
    const rows = options?.includeExclusive ? await this.findActive() : await this.findDefaultActive();
    return rows.map((r) => r.name);
  }
}

export const skills = new SkillRepository();
