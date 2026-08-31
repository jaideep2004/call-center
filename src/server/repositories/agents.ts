import { BaseRepository, FindManyParams } from "./base";
import { queryOne, query } from "@/server/db";
import type { PoolClient } from "pg";

export interface AgentRow {
  id: string;
  agency_id: string;
  membership_id: string;
  approval_status: string;
  availability: string;
  priority: number;
  states: string[];
  zip_prefixes: string[];
  licenses: string[];
  skills: string[];
  endpoint_types: string[];
  last_assigned_at: string | null;
  forwarding_number: string | null;
  npn: string | null;
  display_code: string | null;
  /** Derived: agent has an active call (ringing/connecting/connected). Only set by findAvailable. */
  is_busy?: boolean;
}

export interface AgentWithUser extends AgentRow {
  user_name: string;
  user_email: string;
}

export class AgentRepository extends BaseRepository<AgentRow> {
  protected schema = "app";
  protected table = "agents";

  async findById(id: string, agencyId?: string, client?: PoolClient): Promise<AgentRow> {
    return super.findById(id, agencyId, client);
  }

  async findByIdWithUser(id: string, agencyId?: string): Promise<AgentWithUser | null> {
    const where = agencyId ? `a.id = $1 AND a.agency_id = $2` : `a.id = $1`;
    const params = agencyId ? [id, agencyId] : [id];
    const row = await queryOne<AgentWithUser>(
      `SELECT a.*, u.name as user_name, u.email as user_email
       FROM app.agents a
       JOIN app.memberships m ON m.id = a.membership_id
       JOIN "user" u ON u.id = m.user_id
       WHERE ${where}`,
      params,
    );
    return row ?? null;
  }

  async findByMembershipId(membershipId: string, client?: PoolClient): Promise<AgentRow | null> {
    return queryOne<AgentRow>(
      "SELECT * FROM app.agents WHERE membership_id = $1",
      [membershipId],
      client,
    );
  }

  async findAvailable(agencyId: string, client?: PoolClient): Promise<AgentRow[]> {
    // Busy is derived from live calls, not a mutable flag: an agent with any
    // ringing/connecting/connected call is busy, even if the manual availability
    // toggle still says "available". Self-healing when calls end.
    // Soft-deleted and suspended agents never route.
    return query<AgentRow>(
      `SELECT a.*, EXISTS (
         SELECT 1 FROM app.calls c
         WHERE c.agent_id = a.id
           AND c.state IN ('ringing','connecting','connected')
       ) AS is_busy
       FROM app.agents a
       WHERE a.agency_id = $1
         AND a.approval_status = 'approved'
         AND a.availability = 'available'
       ORDER BY a.priority ASC, a.last_assigned_at ASC NULLS FIRST`,
      [agencyId],
      client,
    );
  }

  async findMany(params: FindManyParams & { agencyId?: string; status?: string } = {}) {
    const { pagination, sortBy = "priority", order = "asc", search, filters, agencyId, status } = params;
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 25;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const queryParams: unknown[] = [];
    let paramIndex = 1;

    if (agencyId) {
      conditions.push(`a.agency_id = $${paramIndex++}`);
      queryParams.push(agencyId);
    }
    if (status) {
      conditions.push(`a.approval_status = $${paramIndex++}`);
      queryParams.push(status);
    }
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          conditions.push(`a.${key} = $${paramIndex++}`);
          queryParams.push(value);
        }
      }
    }
    if (search) {
      conditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderClause = `ORDER BY ${sortBy} ${order}`;

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM app.agents a
       JOIN app.memberships m ON m.id = a.membership_id
       JOIN "user" u ON u.id = m.user_id
       ${where}`,
      queryParams,
    );
    const total = parseInt(countResult?.count ?? "0", 10);

    const rows = await query<AgentWithUser>(
      `SELECT a.*, u.name as user_name, u.email as user_email
       FROM app.agents a
       JOIN app.memberships m ON m.id = a.membership_id
       JOIN "user" u ON u.id = m.user_id
       ${where} ${orderClause} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset],
    );

    return {
      rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(data: {
    agency_id: string;
    membership_id: string;
    states?: string[];
    zip_prefixes?: string[];
    licenses?: string[];
    skills?: string[];
    endpoint_types?: string[];
    npn?: string;
    display_code?: string;
  }, client?: PoolClient): Promise<AgentRow> {
    // Use DB default sequence for display_code if not explicitly provided
    if ((data as Record<string, unknown>).display_code) {
      return super.create(data as Record<string, unknown>, client);
    }
    const keys = Object.keys(data);
    const values = Object.values(data);
    const columns = [...keys, "display_code"].join(", ");
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    const row = await queryOne<AgentRow>(
      `INSERT INTO ${this.fullTable()} (${columns}) VALUES (${placeholders}, 'CC' || nextval('app.agent_code_seq')::text) RETURNING *`,
      values,
      client,
    );
    return row!;
  }

  async updateAvailability(id: string, availability: string, agencyId: string): Promise<AgentRow> {
    return super.update(id, { availability }, agencyId);
  }

  async updateApproval(id: string, approval_status: string, agencyId: string): Promise<AgentRow> {
    return super.update(id, { approval_status }, agencyId);
  }
}

export const agents = new AgentRepository();
