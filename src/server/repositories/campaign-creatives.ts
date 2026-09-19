import { query, queryOne } from "@/server/db";
import type { PoolClient } from "pg";

export type CreativeType = "image" | "video";
export type CreativePlacement = "agent_hero" | "agent_feed";

export interface CampaignCreativeRow {
  id: string;
  agency_id: string;
  campaign_id: string | null;
  type: CreativeType;
  title: string;
  media_url: string;
  thumbnail_url: string | null;
  cta_label: string | null;
  cta_href: string | null;
  placement: CreativePlacement;
  priority: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreativeInput {
  agency_id: string;
  campaign_id?: string | null;
  type: CreativeType;
  title: string;
  media_url: string;
  thumbnail_url?: string | null;
  cta_label?: string | null;
  cta_href?: string | null;
  placement?: CreativePlacement;
  priority?: number;
  active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

function rowToInput(data: CreativeInput): Record<string, unknown> {
  return {
    agency_id: data.agency_id,
    campaign_id: data.campaign_id ?? null,
    type: data.type,
    title: data.title,
    media_url: data.media_url,
    thumbnail_url: data.thumbnail_url ?? null,
    cta_label: data.cta_label ?? null,
    cta_href: data.cta_href ?? null,
    placement: data.placement ?? "agent_feed",
    priority: data.priority ?? 0,
    active: data.active ?? true,
    starts_at: data.starts_at ?? null,
    ends_at: data.ends_at ?? null,
  };
}

/** Live-window predicate shared by feed queries (active + date window + not deleted). */
export function liveCreativeClause(alias = "cc"): string {
  return `${alias}.deleted_at IS NULL AND ${alias}.active = true
    AND (${alias}.starts_at IS NULL OR ${alias}.starts_at <= now())
    AND (${alias}.ends_at IS NULL OR ${alias}.ends_at > now())`;
}

export async function createCreative(
  data: CreativeInput,
  client?: PoolClient,
): Promise<CampaignCreativeRow> {
  const input = rowToInput(data);
  const cols = Object.keys(input);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await query<CampaignCreativeRow>(
    `INSERT INTO app.campaign_creatives (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
    Object.values(input),
    client,
  );
  return rows[0]!;
}

export async function updateCreative(
  id: string,
  agencyId: string,
  data: Partial<Omit<CreativeInput, "agency_id">>,
  client?: PoolClient,
): Promise<CampaignCreativeRow | null> {
  const sets: string[] = [];
  const params: unknown[] = [id, agencyId];
  const allowed: (keyof typeof data)[] = [
    "campaign_id", "type", "title", "media_url", "thumbnail_url",
    "cta_label", "cta_href", "placement", "priority", "active",
    "starts_at", "ends_at",
  ];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      params.push(data[key] ?? null);
      sets.push(`${key} = $${params.length}`);
    }
  }
  if (sets.length === 0) {
    return queryOne<CampaignCreativeRow>(
      `SELECT * FROM app.campaign_creatives WHERE id = $1 AND agency_id = $2 AND deleted_at IS NULL`,
      [id, agencyId],
      client,
    );
  }
  sets.push("updated_at = now()");
  return queryOne<CampaignCreativeRow>(
    `UPDATE app.campaign_creatives SET ${sets.join(", ")}
      WHERE id = $1 AND agency_id = $2 AND deleted_at IS NULL RETURNING *`,
    params,
    client,
  );
}

export async function softDeleteCreative(
  id: string,
  agencyId: string,
  client?: PoolClient,
): Promise<void> {
  await query(
    `UPDATE app.campaign_creatives SET deleted_at = now(), updated_at = now()
      WHERE id = $1 AND agency_id = $2 AND deleted_at IS NULL`,
    [id, agencyId],
    client,
  );
}

export async function listCreatives(
  agencyId: string,
  client?: PoolClient,
): Promise<CampaignCreativeRow[]> {
  return query<CampaignCreativeRow>(
    `SELECT * FROM app.campaign_creatives
      WHERE agency_id = $1 AND deleted_at IS NULL
      ORDER BY priority DESC, created_at DESC`,
    [agencyId],
    client,
  );
}

/**
 * Agent feed (P2.1): live creatives for optional placement, visible to an
 * agent whose assigned campaign ids are `assignedCampaignIds`. Global rows
 * (campaign_id NULL) show for everyone; linked rows only for assigned
 * campaigns. Hero callers slice to 3 for the carousel.
 */
export async function listFeedForAgent(
  agencyId: string,
  assignedCampaignIds: string[],
  placement?: CreativePlacement,
  client?: PoolClient,
): Promise<CampaignCreativeRow[]> {
  const params: unknown[] = [agencyId];
  let placementClause = "";
  if (placement) {
    params.push(placement);
    placementClause = `AND cc.placement = $${params.length}`;
  }
  let scopeClause = `AND cc.campaign_id IS NULL`;
  if (assignedCampaignIds.length > 0) {
    params.push(assignedCampaignIds);
    scopeClause = `AND (cc.campaign_id IS NULL OR cc.campaign_id = ANY($${params.length}::uuid[]))`;
  }
  return query<CampaignCreativeRow>(
    `SELECT cc.* FROM app.campaign_creatives cc
      WHERE cc.agency_id = $1 AND ${liveCreativeClause("cc")}
      ${placementClause} ${scopeClause}
      ORDER BY cc.priority DESC, cc.created_at DESC`,
    params,
    client,
  );
}

export const campaignCreatives = {
  createCreative,
  updateCreative,
  softDeleteCreative,
  listCreatives,
  listFeedForAgent,
};
