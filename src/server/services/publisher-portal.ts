import { randomBytes } from "crypto";
import { query, queryOne } from "@/server/db";
import { publishers, publisherInvites, memberships, campaigns, phoneNumbers } from "@/server/repositories";
import { retreaver } from "@/domain/providers/retreaver";
import { decryptSecret } from "@/server/crypto";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";

export interface PortalOverview {
  publisher: { id: string; name: string; fixed_price_cents: number | null; retreaver_status: string };
  stats: { total_calls: number; qualified_calls: number; payout_cents: number };
  campaigns: {
    campaign_id: string | null;
    campaign_name: string | null;
    price_cents: number | null;
    calls: number;
    qualified_calls: number;
    payout_cents: number;
  }[];
}

export interface PortalCallRow {
  id: string;
  uuid: string;
  caller: string | null;
  status: string | null;
  connected: boolean | null;
  payout_cents: number | null;
  recording_url: string | null;
  campaign_name: string | null;
  created_at: string;
}

export async function getPublisherForUser(userId: string) {
  return publishers.findByUserId(userId);
}

export async function getPortalOverview(publisherId: string): Promise<PortalOverview> {
  const publisher = await publishers.findById(publisherId);

  const statsRow = await queryOne<{ total_calls: string; qualified_calls: string; payout_cents: string }>(
    `SELECT COUNT(*)::text as total_calls,
            COUNT(*) FILTER (WHERE payout_cents > 0)::text as qualified_calls,
            COALESCE(SUM(payout_cents), 0)::text as payout_cents
     FROM app.retreaver_calls
     WHERE publisher_id = $1 AND status = 'finished'`,
    [publisherId],
  );

  // Assigned campaigns MUST list even with zero calls — otherwise a newly
  // assigned publisher sees an empty dashboard. Traffic stats LEFT JOIN on
  // top; join-table + legacy publisher_id are both honored (single row per
  // campaign for this publisher, so no fan-out in the aggregates).
  const campaigns = await query<{
    campaign_id: string | null;
    campaign_name: string | null;
    price_cents: string | null;
    calls: string;
    qualified_calls: string;
    payout_cents: string;
  }>(
    `SELECT c.id as campaign_id, c.name as campaign_name, c.price_cents,
            COUNT(r.*)::text as calls,
            COUNT(r.*) FILTER (WHERE r.payout_cents > 0)::text as qualified_calls,
            COALESCE(SUM(r.payout_cents), 0)::text as payout_cents
     FROM app.campaigns c
     LEFT JOIN app.campaign_publishers cp ON cp.campaign_id = c.id AND cp.publisher_id = $1
     LEFT JOIN app.retreaver_calls r ON r.campaign_id = c.id AND r.publisher_id = $1 AND r.status = 'finished'
     WHERE c.deleted_at IS NULL AND c.status = 'active'
       AND (cp.publisher_id IS NOT NULL OR c.publisher_id = $1)
     GROUP BY c.id, c.name, c.price_cents
     ORDER BY payout_cents DESC`,
    [publisherId],
  );

  return {
    publisher: {
      id: publisher.id,
      name: publisher.name,
      fixed_price_cents: publisher.fixed_price_cents,
      retreaver_status: publisher.retreaver_status,
    },
    stats: {
      total_calls: parseInt(statsRow?.total_calls ?? "0", 10),
      qualified_calls: parseInt(statsRow?.qualified_calls ?? "0", 10),
      payout_cents: parseInt(statsRow?.payout_cents ?? "0", 10),
    },
    campaigns: campaigns.map((c) => ({
      campaign_id: c.campaign_id,
      campaign_name: c.campaign_name,
      price_cents: c.price_cents ? parseInt(c.price_cents, 10) : null,
      calls: parseInt(c.calls, 10),
      qualified_calls: parseInt(c.qualified_calls, 10),
      payout_cents: parseInt(c.payout_cents, 10),
    })),
  };
}

export async function getPortalCalls(
  publisherId: string,
  limit = 25,
  offset = 0,
): Promise<{ rows: PortalCallRow[]; total: number }> {
  const countRow = await queryOne<{ total: string }>(
    "SELECT COUNT(*)::text as total FROM app.retreaver_calls WHERE publisher_id = $1",
    [publisherId],
  );

  const rows = await query<PortalCallRow & { campaign_name: string | null }>(
    `SELECT r.id, r.uuid, r.caller, r.status, r.connected, r.payout_cents,
            r.recording_url, r.created_at, c.name as campaign_name
     FROM app.retreaver_calls r
     LEFT JOIN app.campaigns c ON c.id = r.campaign_id
     WHERE r.publisher_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2 OFFSET $3`,
    [publisherId, limit, offset],
  );

  return { rows, total: parseInt(countRow?.total ?? "0", 10) };
}

export interface PublisherPayouts {
  summary: {
    total_payout_cents: number;
    qualified_calls: number;
    last_30d_payout_cents: number;
    last_30d_qualified_calls: number;
  };
  monthly: { month: string; payout_cents: number; qualified_calls: number }[];
  recent_qualified: {
    id: string;
    caller: string | null;
    payout_cents: number | null;
    campaign_name: string | null;
    created_at: string;
  }[];
}

/** Payout ledger for the publisher portal (roadmap 2.4). */
export async function getPortalPayouts(publisherId: string): Promise<PublisherPayouts> {
  const summaryRow = await queryOne<{
    total_payout_cents: string;
    qualified_calls: string;
    last_30d_payout_cents: string;
    last_30d_qualified_calls: string;
  }>(
    `SELECT COALESCE(SUM(payout_cents), 0)::text AS total_payout_cents,
            COUNT(*) FILTER (WHERE payout_cents > 0)::text AS qualified_calls,
            COALESCE(SUM(payout_cents) FILTER (WHERE created_at > now() - interval '30 days'), 0)::text AS last_30d_payout_cents,
            COUNT(*) FILTER (WHERE payout_cents > 0 AND created_at > now() - interval '30 days')::text AS last_30d_qualified_calls
     FROM app.retreaver_calls
     WHERE publisher_id = $1 AND status = 'finished'`,
    [publisherId],
  );

  const monthly = await query<{ month: string; payout_cents: string; qualified_calls: string }>(
    `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
            COALESCE(SUM(payout_cents), 0)::text AS payout_cents,
            COUNT(*) FILTER (WHERE payout_cents > 0)::text AS qualified_calls
     FROM app.retreaver_calls
     WHERE publisher_id = $1 AND status = 'finished'
       AND created_at > now() - interval '12 months'
     GROUP BY 1 ORDER BY 1 DESC`,
    [publisherId],
  );

  const recent = await query<{
    id: string;
    caller: string | null;
    payout_cents: number | null;
    campaign_name: string | null;
    created_at: string;
  }>(
    `SELECT r.id, r.caller, r.payout_cents, c.name AS campaign_name, r.created_at
     FROM app.retreaver_calls r
     LEFT JOIN app.campaigns c ON c.id = r.campaign_id
     WHERE r.publisher_id = $1 AND r.status = 'finished' AND r.payout_cents > 0
     ORDER BY r.created_at DESC
     LIMIT 20`,
    [publisherId],
  );

  return {
    summary: {
      total_payout_cents: parseInt(summaryRow?.total_payout_cents ?? "0", 10),
      qualified_calls: parseInt(summaryRow?.qualified_calls ?? "0", 10),
      last_30d_payout_cents: parseInt(summaryRow?.last_30d_payout_cents ?? "0", 10),
      last_30d_qualified_calls: parseInt(summaryRow?.last_30d_qualified_calls ?? "0", 10),
    },
    monthly: monthly.map((m) => ({
      month: m.month,
      payout_cents: parseInt(m.payout_cents, 10),
      qualified_calls: parseInt(m.qualified_calls, 10),
    })),
    recent_qualified: recent,
  };
}

export async function createPortalInvite(
  publisherId: string,
  origin: string,
): Promise<{ link: string; email: string; name: string }> {
  const publisher = await publishers.findById(publisherId);
  if (!publisher.email) {
    throw new ValidationError("Publisher has no email — add one before inviting");
  }

  const existing = await publisherInvites.findPendingByPublisher(publisherId);
  if (existing) {
    return { link: `${origin}/register?invite=${existing.token}`, email: publisher.email, name: publisher.name };
  }

  const token = randomBytes(24).toString("hex");
  await publisherInvites.create({ publisher_id: publisherId, email: publisher.email, token });
  return { link: `${origin}/register?invite=${token}`, email: publisher.email, name: publisher.name };
}

export async function acceptPortalInvite(
  token: string,
  userId: string,
  opts: { switchFromAgency?: boolean } = {},
) {
  const invite = await publisherInvites.findByToken(token);
  if (!invite) throw new NotFoundError("Invite not found");
  if (invite.status !== "pending") throw new ConflictError("Invite already used");
  if (new Date(invite.expires_at) < new Date()) throw new ConflictError("Invite expired");

  const publisher = await queryOne<{ id: string; name: string; user_id: string | null; deleted_at: string | null }>(
    "SELECT id, name, user_id, deleted_at FROM app.publishers WHERE id = $1",
    [invite.publisher_id],
  );
  if (!publisher) throw new NotFoundError("Publisher not found");
  if (publisher.deleted_at) throw new ConflictError("Publisher is no longer active");

  const existingLink = await publishers.findByUserId(userId);
  if (existingLink) throw new ConflictError("This account is already linked to a publisher");

  const userRow = await queryOne<{ role: string }>("SELECT role FROM \"user\" WHERE id = $1", [userId]);
  if (!userRow) throw new NotFoundError("User not found");
  if (userRow.role !== "agent" && userRow.role !== "publisher") {
    throw new ConflictError("This account already has a different role");
  }

  const membership = await queryOne<{ id: string }>(
    "SELECT id FROM app.memberships WHERE user_id = $1 AND status = 'active' LIMIT 1",
    [userId],
  );
  // Phase 2.1: agency members can never link silently (single-membership
  // invariant). Explicit switch only: the caller confirms leaving the agency,
  // we end the membership first, then link. Without the flag the 409 tells
  // the UI to offer the "leave agency and switch" button.
  let switchedAgency = false;
  if (membership) {
    if (!opts.switchFromAgency) {
      throw new ConflictError(
        "This account is already part of an agency — leave the agency first, or switch to a publisher account (SWITCH_REQUIRED)",
      );
    }
    // CHECK constraint on memberships.status is ('invited','active','suspended'):
    // 'suspended' is the deactivated state (resolveAuth + routing only honor
    // 'active'), so a switched user is fully cut off from the old agency.
    await memberships.updateStatus(membership.id, "suspended");
    switchedAgency = true;
  }

  await query(`UPDATE "user" SET role = 'publisher' WHERE id = $1`, [userId]);
  const linked = await publishers.linkUser(publisher.id, userId);
  await publisherInvites.accept(token);
  try {
    const { clearAuthCache } = await import("@/server/api-utils");
    clearAuthCache();
  } catch {}

  return {
    publisher: {
      id: linked.id,
      name: linked.name,
      fixed_price_cents: linked.fixed_price_cents,
      retreaver_status: linked.retreaver_status,
    },
    switchedAgency,
  };
}

export interface TrackingLinkData {
  publisherId: string;
  publisherName: string;
  campaignId: string;
  campaignName: string;
  trackingNumber: string;
}

/**
 * Resolve a public tracking link /t/[afid]?cid=[campaign]. Returns null when
 * the afid is unknown, the campaign is missing/inactive, the campaign has no
 * live tracking number, or the publisher is not assigned to the campaign
 * (join-table or legacy publisher_id) — the page renders 404 in all cases so
 * unassigned campaigns can never be advertised.
 */
export async function getTrackingLinkData(afid: string, campaignId: string): Promise<TrackingLinkData | null> {
  const publisher = await publishers.findByAfid(afid).catch(() => null);
  if (!publisher) return null;
  const campaign = await campaigns.findById(campaignId).catch(() => null);
  if (!campaign || campaign.status !== "active" || (campaign as { deleted_at?: string | null }).deleted_at) return null;
  const assigned = await queryOne<{ one: number }>(
    `SELECT 1 AS one FROM app.campaign_publishers WHERE campaign_id = $1 AND publisher_id = $2
      UNION SELECT 1 AS one FROM app.campaigns WHERE id = $1 AND publisher_id = $2
     LIMIT 1`,
    [campaignId, publisher.id],
  ).catch(() => null);
  if (!assigned) return null;
  const number = await phoneNumbers.findByCampaign(campaignId).catch(() => null);
  if (!number) return null;
  return {
    publisherId: publisher.id,
    publisherName: publisher.name,
    campaignId: campaign.id,
    campaignName: campaign.name,
    trackingNumber: number.e164,
  };
}

/** Best-effort click log for the public tracking page. Never throws. */
export async function recordTrackingClick(opts: {
  publisherId: string;
  campaignId: string;
  referrer?: string | null;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO app.tracking_clicks (publisher_id, campaign_id, referrer) VALUES ($1, $2, $3)`,
      [opts.publisherId, opts.campaignId, opts.referrer ?? null],
    );
  } catch {
    /* stats must never break the page */
  }
}

/** Per-campaign click counts (last 30 days) for a publisher's Tracking Links card. */
export async function getClickStats(publisherId: string): Promise<{ campaign_id: string; clicks: number }[]> {
  try {
    return await query<{ campaign_id: string; clicks: number }>(
      `SELECT campaign_id, COUNT(*)::int AS clicks FROM app.tracking_clicks
        WHERE publisher_id = $1 AND created_at > now() - interval '30 days'
       GROUP BY campaign_id`,
      [publisherId],
    );
  } catch {
    return [];
  }
}

export interface PublisherRetreaverLink {
  linked: boolean;
  reason?: string;
  campaign_id: string;
  campaign_name: string;
  retreaver_cid: string | null;
  /** False when the publisher was never provisioned on Retreaver (no afid):
   * ping values would not attribute, so the portal shows a provisioning
   * notice instead of misleading IDs. */
  provisioned: boolean;
  /** Retreaver DID assigned to this publisher's afid on the campaign, if any. */
  tracking_number: string | null;
  /** How many Retreaver numbers were checked. Null = the lookup itself failed. */
  numbers_checked: number | null;
  rtb: {
    enabled: boolean;
    /** The rtb.retreaver.com ping endpoint publishers POST calls to. */
    endpoint: string;
    /** Publisher identity Retreaver attributes calls to. Null until provisioned. */
    publisher_id: string | null;
    /** Campaign RTB key (revealed on demand in the portal). Null when unset. */
    key: string | null;
  } | null;
}

/**
 * The Retreaver-side connection details for one publisher + campaign — the
 * rtb.retreaver.com details publishers paste into their own tracker/dialer
 * when they already run their own tracking (as opposed to our /t/ link,
 * which routes through our numbers first). Throws 404/403 for unknown,
 * unassigned, or soft-deleted rows; returns linked:false when the campaign
 * is not active on Retreaver yet.
 */
export async function getPublisherCampaignRetreaverLink(
  publisherId: string,
  campaignId: string,
): Promise<PublisherRetreaverLink> {
  const publisher = await publishers.findById(publisherId).catch(() => null);
  if (!publisher || (publisher as { deleted_at?: string | null }).deleted_at) {
    throw new NotFoundError("Publisher not found");
  }
  const campaign = await campaigns.findById(campaignId).catch(() => null);
  if (!campaign || (campaign as { deleted_at?: string | null }).deleted_at) {
    throw new NotFoundError("Campaign not found");
  }
  const assigned = await queryOne<{ one: number }>(
    `SELECT 1 AS one FROM app.campaign_publishers WHERE campaign_id = $1 AND publisher_id = $2
      UNION SELECT 1 AS one FROM app.campaigns WHERE id = $1 AND publisher_id = $2
     LIMIT 1`,
    [campaignId, publisher.id],
  ).catch(() => null);
  if (!assigned) throw new ForbiddenError("This campaign is not assigned to you");

  const base = {
    campaign_id: campaign.id,
    campaign_name: campaign.name,
    retreaver_cid: campaign.retreaver_cid,
    provisioned: publisher.afid != null,
  };
  if (campaign.status !== "active" || !campaign.retreaver_cid) {
    return {
      ...base,
      linked: false,
      reason: !campaign.retreaver_cid
        ? "Not deployed to Retreaver yet — ask your account manager"
        : `Campaign is ${campaign.status} — Retreaver details unlock when it is active`,
      tracking_number: null,
      numbers_checked: null,
      rtb: null,
    };
  }

  // Without an afid nothing Retreaver-side can attribute to this publisher:
  // surface the provisioning gap instead of an internal UUID that would
  // silently misattribute pings.
  if (!publisher.afid) {
    return {
      ...base,
      linked: true,
      reason: "Your account is not provisioned on Retreaver yet — ask your account manager to provision it. The number + ping details unlock after that.",
      tracking_number: null,
      numbers_checked: null,
      rtb: {
        enabled: campaign.rtb_enabled,
        endpoint: "https://rtb.retreaver.com/rtbs.json",
        publisher_id: null,
        key: null,
      },
    };
  }

  // Retreaver DID carrying this publisher's afid (best-effort: a Retreaver
  // outage must not hide the RTB ping block below).
  let tracking_number: string | null = null;
  let numbers_checked: number | null = null;
  try {
    const numbers = await retreaver.listNumbers({ cid: campaign.retreaver_cid });
    numbers_checked = numbers.length;
    tracking_number =
      numbers.find((n) => n.afid === publisher.afid)?.number ?? null;
  } catch {
    tracking_number = null;
    numbers_checked = null;
  }

  let key: string | null = null;
  if (campaign.rtb_enabled && campaign.rtb_postback_key_encrypted) {
    try {
      key = decryptSecret(campaign.rtb_postback_key_encrypted);
    } catch {
      key = null;
    }
  }

  return {
    ...base,
    linked: true,
    tracking_number,
    numbers_checked,
    rtb: {
      enabled: campaign.rtb_enabled,
      endpoint: "https://rtb.retreaver.com/rtbs.json",
      publisher_id: publisher.afid,
      key,
    },
  };
}
