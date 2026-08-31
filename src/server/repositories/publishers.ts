import { BaseRepository } from "./base";
import { query } from "@/server/db";

export interface PublisherRow {
  id: string;
  name: string;
  email: string | null;
  afid: string | null;
  commission_pct: number;
  fixed_price_cents: number | null;
  retreaver_status: string;
  active: boolean;
  user_id: string | null;
  created_at: string;
}

export class PublisherRepository extends BaseRepository<PublisherRow> {
  protected schema = "app";
  protected table = "publishers";

  async findAll(): Promise<PublisherRow[]> {
    return query<PublisherRow>(
      `SELECT * FROM app.publishers WHERE deleted_at IS NULL ORDER BY name ASC`,
    );
  }

  async findActive(): Promise<PublisherRow[]> {
    return query<PublisherRow>(
      `SELECT * FROM app.publishers WHERE deleted_at IS NULL AND active = true ORDER BY name ASC`,
    );
  }

  async findByAfid(afid: string): Promise<PublisherRow | null> {
    const rows = await query<PublisherRow>(
      `SELECT * FROM app.publishers WHERE deleted_at IS NULL AND afid = $1 LIMIT 1`,
      [afid],
    );
    return rows[0] ?? null;
  }

  async create(data: {
    name: string;
    email?: string;
    afid?: string;
    commission_pct?: number;
    fixed_price_cents?: number;
    active?: boolean;
  }): Promise<PublisherRow> {
    return super.create({
      name: data.name,
      email: data.email || null,
      afid: data.afid || null,
      commission_pct: data.commission_pct ?? 0,
      fixed_price_cents: data.fixed_price_cents || null,
      active: data.active ?? true,
    });
  }

  async updateRetreaverStatus(id: string, status: string): Promise<PublisherRow> {
    const rows = await query<PublisherRow>(
      `UPDATE app.publishers SET retreaver_status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
      [id, status],
    );
    return rows[0];
  }

  async findByUserId(userId: string): Promise<PublisherRow | null> {
    const rows = await query<PublisherRow>(
      `SELECT * FROM app.publishers WHERE deleted_at IS NULL AND user_id = $1 LIMIT 1`,
      [userId],
    );
    return rows[0] ?? null;
  }

  async linkUser(id: string, userId: string): Promise<PublisherRow> {
    const rows = await query<PublisherRow>(
      `UPDATE app.publishers SET user_id = $2, updated_at = now() WHERE id = $1 RETURNING *`,
      [id, userId],
    );
    return rows[0];
  }
}

export const publishers = new PublisherRepository();
