import { query } from "@/server/db";
import type { PoolClient } from "pg";

export interface AgentCampaignSelectionRow {
  agent_id: string;
  campaign_id: string;
  is_live: boolean;
  updated_at: string;
}

/** Upsert an agent's live flag for one campaign (Take Calls selector). */
export async function setLive(
  agentId: string,
  campaignId: string,
  isLive: boolean,
  client?: PoolClient,
): Promise<AgentCampaignSelectionRow> {
  const rows = await query<AgentCampaignSelectionRow>(
    `INSERT INTO app.agent_campaign_selections (agent_id, campaign_id, is_live, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (agent_id, campaign_id) DO UPDATE SET is_live = EXCLUDED.is_live, updated_at = now()
     RETURNING *`,
    [agentId, campaignId, isLive],
    client,
  );
  return rows[0]!;
}

/** Campaign ids this agent is live for. Empty = never selected (treated as not-live for gated routing). */
export async function getLiveCampaignIds(agentId: string, client?: PoolClient): Promise<string[]> {
  const rows = await query<{ campaign_id: string }>(
    `SELECT campaign_id FROM app.agent_campaign_selections WHERE agent_id = $1 AND is_live = true`,
    [agentId],
    client,
  );
  return rows.map((r) => r.campaign_id);
}

/** Agent ids live for a campaign. `null` = nobody has ever selected (legacy open routing). */
export async function findLiveAgentIds(campaignId: string, client?: PoolClient): Promise<string[] | null> {
  const anyRows = await query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM app.agent_campaign_selections WHERE campaign_id = $1`,
    [campaignId],
    client,
  );
  if (parseInt(anyRows[0]?.count ?? "0", 10) === 0) return null;
  const rows = await query<{ agent_id: string }>(
    `SELECT agent_id FROM app.agent_campaign_selections WHERE campaign_id = $1 AND is_live = true`,
    [campaignId],
    client,
  );
  return rows.map((r) => r.agent_id);
}

export async function isLive(agentId: string, campaignId: string, client?: PoolClient): Promise<boolean> {
  const rows = await query<{ is_live: boolean }>(
    `SELECT is_live FROM app.agent_campaign_selections WHERE agent_id = $1 AND campaign_id = $2`,
    [agentId, campaignId],
    client,
  );
  return rows[0]?.is_live ?? false;
}

export const agentCampaignSelections = {
  setLive,
  getLiveCampaignIds,
  findLiveAgentIds,
  isLive,
};
