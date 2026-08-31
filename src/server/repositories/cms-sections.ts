import { query, queryOne } from "@/server/db";

export interface CmsSectionRow {
  id: string;
  slug: string;
  title: string;
  content: Record<string, unknown>;
  active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export class CmsSectionRepository {
  async findActive(): Promise<CmsSectionRow[]> {
    return query<CmsSectionRow>(
      "SELECT * FROM app.cms_sections WHERE active = true ORDER BY slug ASC",
    );
  }

  async findAll(): Promise<CmsSectionRow[]> {
    return query<CmsSectionRow>("SELECT * FROM app.cms_sections ORDER BY slug ASC");
  }

  async findBySlug(slug: string): Promise<CmsSectionRow | null> {
    return queryOne<CmsSectionRow>("SELECT * FROM app.cms_sections WHERE slug = $1", [slug]);
  }

  async create(data: { slug: string; title: string; content?: Record<string, unknown>; updated_by?: string | null }): Promise<CmsSectionRow> {
    const row = await queryOne<CmsSectionRow>(
      `INSERT INTO app.cms_sections (slug, title, content, updated_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.slug, data.title, JSON.stringify(data.content ?? {}), data.updated_by ?? null],
    );
    return row!;
  }

  async update(
    slug: string,
    data: { title?: string; content?: Record<string, unknown>; active?: boolean; updated_by?: string | null },
  ): Promise<CmsSectionRow | null> {
    const sets: string[] = [];
    const params: unknown[] = [slug];
    if (data.title !== undefined) { params.push(data.title); sets.push(`title = $${params.length}`); }
    if (data.content !== undefined) { params.push(JSON.stringify(data.content)); sets.push(`content = $${params.length}`); }
    if (data.active !== undefined) { params.push(data.active); sets.push(`active = $${params.length}`); }
    if (data.updated_by !== undefined) { params.push(data.updated_by); sets.push(`updated_by = $${params.length}`); }
    sets.push("updated_at = now()");
    return queryOne<CmsSectionRow>(
      `UPDATE app.cms_sections SET ${sets.join(", ")} WHERE slug = $1 RETURNING *`,
      params,
    );
  }
}

export const cmsSections = new CmsSectionRepository();
