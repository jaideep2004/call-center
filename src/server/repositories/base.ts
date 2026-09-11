import { query, queryOne } from "@/server/db";
import { NotFoundError } from "@/server/errors";
import type { PoolClient } from "pg";

export interface PaginationInput {
  page: number;
  limit: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FindManyParams {
  pagination?: PaginationInput;
  sortBy?: string;
  order?: "asc" | "desc";
  search?: string;
  filters?: Record<string, unknown>;
}

const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export abstract class BaseRepository<T> {
  protected abstract table: string;
  protected abstract schema: string;

  fullTable(): string {
    return `${this.schema}.${this.table}`;
  }

  async findById(id: string, agencyId?: string, client?: PoolClient): Promise<T> {
    const where = agencyId ? `id = $1 AND agency_id = $2` : `id = $1`;
    const params = agencyId ? [id, agencyId] : [id];
    const row = await queryOne<T>(`SELECT * FROM ${this.fullTable()} WHERE ${where}`, params, client);
    if (!row) throw new NotFoundError(`${this.table.slice(0, -1)} not found`);
    return row;
  }

  async findMany(params: FindManyParams = {}): Promise<{ rows: T[]; pagination: PaginationResult }> {
    const { pagination, sortBy, order = "desc", search, filters } = params;
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 25;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const queryParams: unknown[] = [];
    let paramIndex = 1;

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          if (!IDENTIFIER_RE.test(key)) continue;
          if (Array.isArray(value)) {
            if (value.length === 0) {
              conditions.push(`1=0`);
            } else if (value.length === 1) {
              conditions.push(`${key} = $${paramIndex}`);
              queryParams.push(value[0]);
              paramIndex++;
            } else {
              conditions.push(`${key}::text = ANY($${paramIndex}::text[])`);
              queryParams.push(value);
              paramIndex++;
            }
          } else {
            conditions.push(`${key} = $${paramIndex}`);
            queryParams.push(value);
            paramIndex++;
          }
        }
      }
    }

    if (search) {
      conditions.push(`(id::text ILIKE $${paramIndex} OR true)`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const safeSort = sortBy && IDENTIFIER_RE.test(sortBy) ? sortBy : null;
    const safeOrder = order === "asc" || order === "desc" ? order : "desc";
    const orderClause = safeSort ? `ORDER BY ${safeSort} ${safeOrder}` : "ORDER BY created_at DESC";

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${this.fullTable()} ${where}`,
      queryParams,
    );
    const total = parseInt(countResult?.count ?? "0", 10);

    const rows = await query<T>(
      `SELECT * FROM ${this.fullTable()} ${where} ${orderClause} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset],
    );

    return {
      rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(data: Record<string, unknown>, client?: PoolClient): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    const columns = keys.join(", ");
    const row = await queryOne<T>(
      `INSERT INTO ${this.fullTable()} (${columns}) VALUES (${placeholders}) RETURNING *`,
      values,
      client,
    );
    return row!;
  }

  async update(id: string, data: Record<string, unknown>, agencyId?: string, client?: PoolClient): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(", ");
    const where = agencyId ? `id = $1 AND agency_id = $${keys.length + 2}` : `id = $1`;
    const params = agencyId ? [id, ...values, agencyId] : [id, ...values];
    const row = await queryOne<T>(
      `UPDATE ${this.fullTable()} SET ${setClause} WHERE ${where} RETURNING *`,
      params,
      client,
    );
    if (!row) throw new NotFoundError(`${this.table.slice(0, -1)} not found`);
    return row;
  }

  async softDelete(id: string, agencyId?: string): Promise<void> {
    const where = agencyId ? `id = $1 AND agency_id = $2` : `id = $1`;
    const params = agencyId ? [id, agencyId] : [id];
    const row = await queryOne<T>(
      `UPDATE ${this.fullTable()} SET deleted_at = NOW() WHERE ${where} RETURNING id`,
      params,
    );
    if (!row) throw new NotFoundError(`${this.table.slice(0, -1)} not found`);
  }
}
