import { query } from "@/server/db";
import { transaction } from "@/server/db";
import type { PoolClient } from "pg";

export interface CampaignAssignmentRow {
  id: string;
  campaign_id: string;
  agency_id: string | null;
  agent_id: string | null;
  assigned_by: string | null;
  created_at: string;
}

export async function findForCampaign(campaignId: string, client?: PoolClient): Promise<CampaignAssignmentRow[]> {
  return query<CampaignAssignmentRow>(
    `SELECT * FROM app.campaign_assignments WHERE campaign_id = $1 ORDER BY created_at ASC`,
    [campaignId],
    client,
  );
}

export async function findAgencyIds(campaignId: string, client?: PoolClient): Promise<string[]> {
  const rows = await query<{ agency_id: string }>(
    `SELECT agency_id FROM app.campaign_assignments WHERE campaign_id = $1 AND agency_id IS NOT NULL`,
    [campaignId],
    client,
  );
  return rows.map((r) => r.agency_id);
}

export async function findAgentIds(campaignId: string, client?: PoolClient): Promise<string[]> {
  const rows = await query<{ agent_id: string }>(
    `SELECT agent_id FROM app.campaign_assignments WHERE campaign_id = $1 AND agent_id IS NOT NULL`,
    [campaignId],
    client,
  );
  return rows.map((r) => r.agent_id);
}

export async function findForAgency(agencyId: string, client?: PoolClient): Promise<CampaignAssignmentRow[]> {
  return query<CampaignAssignmentRow>(
    `SELECT * FROM app.campaign_assignments WHERE agency_id = $1 ORDER BY created_at ASC`,
    [agencyId],
    client,
  );
}

export async function findForAgent(agentId: string, client?: PoolClient): Promise<CampaignAssignmentRow[]> {
  return query<CampaignAssignmentRow>(
    `SELECT * FROM app.campaign_assignments WHERE agent_id = $1 ORDER BY created_at ASC`,
    [agentId],
    client,
  );
}

export async function findCampaignIdsForAgencyOrAgent(agencyId: string, agentId?: string): Promise<string[]> {
  if (agentId) {
    const rows = await query<{ campaign_id: string }>(
      `SELECT DISTINCT campaign_id FROM app.campaign_assignments
     WHERE agency_id = $1 OR (agent_id IS NOT NULL AND agent_id = $2)`,
      [agencyId, agentId],
    );
    return rows.map((r) => r.campaign_id);
  }
  const rows = await query<{ campaign_id: string }>(
    `SELECT DISTINCT campaign_id FROM app.campaign_assignments WHERE agency_id = $1`,
    [agencyId],
  );
  return rows.map((r) => r.campaign_id);
}

export async function hasAssignments(campaignId: string, client?: PoolClient): Promise<boolean> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM app.campaign_assignments WHERE campaign_id = $1`,
    [campaignId],
    client,
  );
  return parseInt(rows[0]?.count ?? "0", 10) > 0;
}

export async function findAllAssignedCampaignIds(): Promise<string[]> {
  const rows = await query<{ campaign_id: string }>(
    `SELECT DISTINCT campaign_id FROM app.campaign_assignments`,
  );
  return rows.map((r) => r.campaign_id);
}

export async function replaceForCampaign(
  campaignId: string,
  data: { agencyIds: string[]; agentIds: string[]; assignedBy?: string },
): Promise<{ agencyIds: string[]; agentIds: string[] }> {
  const { agencyIds, agentIds, assignedBy } = data;
  await transaction(async (client) => {
    await client.query(`DELETE FROM app.campaign_assignments WHERE campaign_id = $1`, [campaignId]);
    for (const agencyId of agencyIds) {
      await client.query(
        `INSERT INTO app.campaign_assignments (campaign_id, agency_id, assigned_by) VALUES ($1, $2, $3)`,
        [campaignId, agencyId, assignedBy ?? null],
      );
    }
    for (const agentId of agentIds) {
      await client.query(
        `INSERT INTO app.campaign_assignments (campaign_id, agent_id, assigned_by) VALUES ($1, $2, $3)`,
        [campaignId, agentId, assignedBy ?? null],
      );
    }
  });
  return { agencyIds, agentIds };
}

export async function addAgent(
  campaignId: string,
  agentId: string,
  assignedBy?: string,
): Promise<CampaignAssignmentRow | null> {
  const rows = await query<CampaignAssignmentRow>(
    `INSERT INTO app.campaign_assignments (campaign_id, agent_id, assigned_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING *`,
    [campaignId, agentId, assignedBy ?? null],
  );
  if (rows[0]) return rows[0];
  const existing = await query<CampaignAssignmentRow>(
    `SELECT * FROM app.campaign_assignments WHERE campaign_id = $1 AND agent_id = $2 LIMIT 1`,
    [campaignId, agentId],
  );
  return existing[0] ?? null;
}

export async function addAgency(
  campaignId: string,
  agencyId: string,
  assignedBy?: string,
): Promise<CampaignAssignmentRow | null> {
  const rows = await query<CampaignAssignmentRow>(
    `INSERT INTO app.campaign_assignments (campaign_id, agency_id, assigned_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING *`,
    [campaignId, agencyId, assignedBy ?? null],
  );
  if (rows[0]) return rows[0];
  const existing = await query<CampaignAssignmentRow>(
    `SELECT * FROM app.campaign_assignments WHERE campaign_id = $1 AND agency_id = $2 LIMIT 1`,
    [campaignId, agencyId],
  );
  return existing[0] ?? null;
}

export const campaignAssignments = {
  findForCampaign,
  findAgencyIds,
  findAgentIds,
  findForAgency,
  findForAgent,
  findCampaignIdsForAgencyOrAgent,
  hasAssignments,
  findAllAssignedCampaignIds,
  replaceForCampaign,
  addAgent,
  addAgency,
};
