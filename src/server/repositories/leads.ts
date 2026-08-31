import { BaseRepository, FindManyParams } from "./base";
import { query, queryOne } from "@/server/db";
import { leadStatusForOutcome } from "@/server/constants";
import type { PoolClient } from "pg";

export interface LeadRow {
  id: string;
  agency_id: string;
  email_hash: string | null;
  phone_hash: string | null;
  source: string | null;
  status: string;
  assigned_agent_id: string | null;
  call_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LeadRowWithCall extends LeadRow {
  last_call_started_at: string | null;
  last_call_duration_seconds: number | null;
  disposition_outcome: string | null;
  annual_premium_cents: number | null;
}

const STATUS_RANK: Record<string, number> = { new: 0, contacted: 1, qualified: 2, converted: 3 };

interface LeadFilterParams {
  agencyId: string;
  search?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
  status?: string;
  source?: string;
  assignedAgentId?: string;
  startDate?: string;
  endDate?: string;
}

export class LeadRepository extends BaseRepository<LeadRow> {
  protected schema = "app";
  protected table = "leads";

  async findById(id: string, agencyId?: string): Promise<LeadRow> {
    return super.findById(id, agencyId);
  }

  async findMany(params: FindManyParams & { agencyId?: string; assignedAgentId?: string } = {}) {
    return super.findMany({
      ...params,
      filters: {
        ...(params.agencyId ? { agency_id: params.agencyId } : {}),
        ...(params.assignedAgentId ? { assigned_agent_id: params.assignedAgentId } : {}),
        ...params.filters,
      },
    });
  }

  async findManyWithFilters(params: LeadFilterParams) {
    const { agencyId, search, sortBy = "created_at", order = "desc", page = 1, limit = 25, status, source, assignedAgentId, startDate, endDate } = params;
    const offset = (page - 1) * limit;
    const where: string[] = ["agency_id = $1", "deleted_at IS NULL"];
    const values: unknown[] = [agencyId];
    let idx = 1;

    if (search) { values.push(`%${search}%`); where.push(`(email_hash::text LIKE $${++idx} OR phone_hash::text LIKE $${idx})`); }
    if (status) { values.push(status); where.push(`status = $${++idx}`); }
    if (source) { values.push(source); where.push(`source = $${++idx}`); }
    if (assignedAgentId) { values.push(assignedAgentId); where.push(`assigned_agent_id = $${++idx}`); }
    if (startDate) { values.push(startDate); where.push(`created_at >= $${++idx}`); }
    if (endDate) { values.push(endDate); where.push(`created_at <= $${++idx}`); }

    const allowedSort = ["created_at", "updated_at", "source", "status", "email_hash"];
    const safeSort = allowedSort.includes(sortBy) ? sortBy : "created_at";
    const safeOrder = order === "asc" ? "ASC" : "DESC";

    const countRow = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM app.leads WHERE ${where.join(" AND ")}`,
      values,
    );
    const total = countRow?.count ?? 0;

    const rows = await query<LeadRowWithCall>(
      `SELECT l.*, lc.started_at as last_call_started_at,
              EXTRACT(EPOCH FROM (lc.ended_at - lc.connected_at))::int as last_call_duration_seconds,
              ld.outcome as disposition_outcome, ld.annual_premium_cents
       FROM app.leads l
       LEFT JOIN app.calls lc ON lc.id = l.call_id
       LEFT JOIN app.dispositions ld ON ld.call_id = lc.id
       WHERE ${where.join(" AND ")} ORDER BY ${safeSort} ${safeOrder} LIMIT $${idx + 1} OFFSET $${idx + 2}`,
      [...values, limit, offset],
    );

    return {
      rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(data: {
    agency_id: string;
    email_hash?: string;
    phone_hash?: string;
    source?: string;
    status?: string;
  }): Promise<LeadRow> {
    return super.create(data);
  }

  async createFromCall(data: {
    agencyId: string;
    phoneHash: string;
    campaignId: string;
    agentId: string;
    outcome: string;
    callId: string;
    actorMembershipId: string;
  }, client: PoolClient): Promise<LeadRow> {
    const existing = await queryOne<LeadRow>(
      "SELECT * FROM app.leads WHERE agency_id = $1 AND phone_hash = $2 AND deleted_at IS NULL",
      [data.agencyId, data.phoneHash],
      client,
    );

    const newStatus = leadStatusForOutcome(data.outcome);
    const currentRank = existing ? (STATUS_RANK[existing.status] ?? 0) : -1;
    const status = (STATUS_RANK[newStatus] ?? 0) > currentRank ? newStatus : (existing?.status ?? newStatus);

    let lead: LeadRow;
    if (existing) {
      lead = (await queryOne<LeadRow>(
        `UPDATE app.leads
         SET status = $3, assigned_agent_id = COALESCE($4, assigned_agent_id), call_id = COALESCE(call_id, $5), updated_at = now()
         WHERE id = $1 AND agency_id = $2
         RETURNING *`,
        [existing.id, data.agencyId, status, data.agentId, data.callId],
        client,
      ))!;
    } else {
      lead = (await queryOne<LeadRow>(
        `INSERT INTO app.leads (agency_id, phone_hash, source, status, assigned_agent_id, call_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [data.agencyId, data.phoneHash, data.campaignId, status, data.agentId, data.callId],
        client,
      ))!;
    }

    await client.query(
      `INSERT INTO app.lead_timeline (agency_id, lead_id, actor_membership_id, type, body)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.agencyId, lead.id, data.actorMembershipId, "lead.created", { source: "call_disposition", call_id: data.callId, outcome: data.outcome }],
    );
    await client.query(
      `UPDATE app.calls SET lead_id = $1 WHERE id = $2`,
      [lead.id, data.callId],
    );

    return lead;
  }

  async assign(id: string, agentId: string, agencyId: string): Promise<LeadRow> {
    return super.update(id, { assigned_agent_id: agentId, updated_at: new Date().toISOString() }, agencyId);
  }

  async getDistinctSources(agencyId: string): Promise<string[]> {
    const rows = await query<{ source: string }>(
      "SELECT DISTINCT source FROM app.leads WHERE agency_id = $1 AND source IS NOT NULL ORDER BY source",
      [agencyId],
    );
    return rows.map((r) => r.source);
  }
}

export const leads = new LeadRepository();
