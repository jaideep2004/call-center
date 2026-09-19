import { query, queryOne } from "@/server/db";
import { NotFoundError, ValidationError } from "@/server/errors";
import {
  callerStateFromNumber,
  findRoutableAgentId,
  resolveNpaState,
} from "@/server/services/ping-evaluator";

export interface EligibleOffer {
  campaign_id: string;
  agency_id: string;
  name: string;
  /** Effective buyer price: bid override wins, else campaign price. */
  bid_cents: number;
  /** Effective max publisher payout: bid-override payout wins, else campaign max. */
  payout_cents: number;
  buffer_seconds: number;
}

export interface EligibleOffersResult {
  caller_state: string | null;
  eligible: EligibleOffer[];
  /** campaign_id -> machine-readable rejection reasons (mirrors routeCall snapshot style). */
  rejected: Record<string, string[]>;
}

interface OfferRow {
  campaign_id: string;
  agency_id: string;
  name: string;
  target_states: string[] | null;
  price_cents: number | null;
  max_publisher_payout_cents: number | null;
  buffer_seconds: number | null;
  min_connected_seconds: number | null;
  override_price_cents: number | null;
  override_payout_cents: number | null;
}

/**
 * Pre-selection eligibility (P1.3 — runs BEFORE Retreaver picks a winner).
 * Pure read: no Retreaver calls, no writes. An offer enters the pool only if
 * ALL hold:
 *  1. status='active' AND rtb_enabled (enforced in SQL for offers; the
 *     publisher campaign is validated the same way up front).
 *  2. Effective payout within the publisher's [min, max] bounds (when given);
 *     effective bid - payout >= 0 (margin guard, buyer never loses money).
 *  3. State match: offer target_states empty = any state, else must include
 *     the caller state (NPA-derived unless explicitly overridden).
 *  4. >=1 routable agent for that offer (approved + available + not-busy +
 *     state/wallet match + live for the campaign, legacy-open fallback) via
 *     the shared ping-first gate — same semantics as evaluatePing/routeCall.
 *  5. Wallet: current single-wallet gate inside findRoutableAgentId. Dual
 *     wallets (effective = personal + allocation) land in P1.4. Caps: no
 *     caps columns exist yet — no-op until P1.4/P1.5 defines them.
 *
 * Pool is platform-wide (buyer offers may belong to any agency); each offer
 * is agent-checked within its own agency. Exclusive offers ("Only For
 * Agents/Agencies") never enter the open pool — they flow through assigned
 * routing only (routeCall enforces the assignment match). Winner selection
 * stays in Retreaver (Route-By-Bid) — Node never runs a bid loop.
 */
export async function getEligibleOffers(input: {
  publisher_campaign_id: string;
  caller_number?: string | null;
  caller_state?: string | null;
  publisher_payout_min_cents?: number | null;
  publisher_payout_max_cents?: number | null;
}): Promise<EligibleOffersResult> {
  const pub = await queryOne<{
    id: string;
    status: string;
    rtb_enabled: boolean;
  }>(
    `SELECT id, status, rtb_enabled FROM app.campaigns WHERE id = $1 AND deleted_at IS NULL`,
    [input.publisher_campaign_id],
  );
  if (!pub) throw new NotFoundError("Publisher campaign not found");
  if (pub.status !== "active") throw new ValidationError("Publisher campaign is not active");
  if (!pub.rtb_enabled) throw new ValidationError("Publisher campaign is not RTB-enabled");

  let callerState = input.caller_state?.trim().toUpperCase() || null;
  if (!callerState && input.caller_number) {
    const npa = callerStateFromNumber(input.caller_number);
    callerState = npa ? await resolveNpaState(npa) : null;
  }

  const minPayout = input.publisher_payout_min_cents ?? null;
  const maxPayout = input.publisher_payout_max_cents ?? null;

  const offers = await query<OfferRow>(
    `SELECT c.id AS campaign_id, c.agency_id, c.name, c.target_states,
            c.price_cents, c.max_publisher_payout_cents,
            c.buffer_seconds, c.min_connected_seconds,
            bo.price_cents AS override_price_cents,
            bo.payout_cents AS override_payout_cents
       FROM app.campaigns c
       LEFT JOIN app.bid_overrides bo ON bo.campaign_id = c.id
      WHERE c.deleted_at IS NULL
        AND c.status = 'active'
        AND c.rtb_enabled = true
        AND c.id <> $1
        AND COALESCE(c.is_exclusive, false) = false
        AND COALESCE(c.visibility, 'default') = 'default'`,
    [input.publisher_campaign_id],
  );

  const eligible: EligibleOffer[] = [];
  const rejected: Record<string, string[]> = {};
  const survivors: { row: OfferRow; bid: number; payout: number }[] = [];

  for (const row of offers) {
    const reasons: string[] = [];
    const bid = row.override_price_cents ?? row.price_cents;
    const payout = row.override_payout_cents ?? row.max_publisher_payout_cents;
    if (bid == null) reasons.push("bid_not_configured");
    if (payout == null) reasons.push("payout_not_configured");
    if (bid != null && payout != null) {
      if (minPayout != null && payout < minPayout) reasons.push("payout_below_min");
      if (maxPayout != null && payout > maxPayout) reasons.push("payout_above_max");
      if (bid - payout < 0) reasons.push("negative_margin");
    }
    const allowed = row.target_states ?? [];
    if (allowed.length > 0 && (!callerState || !allowed.includes(callerState))) {
      reasons.push("state_mismatch");
    }
    if (reasons.length > 0) {
      rejected[row.campaign_id] = reasons;
      continue;
    }
    survivors.push({ row, bid: bid!, payout: payout! });
  }

  // Agent gate per surviving offer (parallel on the pool; survivors are few
  // after range/margin/state filtering — accuracy first per client).
  await Promise.all(
    survivors.map(async ({ row, bid, payout }) => {
      const agentId = await findRoutableAgentId({
        agencyId: row.agency_id,
        campaignId: row.campaign_id,
        state: callerState,
        priceCents: bid,
      });
      if (!agentId) {
        rejected[row.campaign_id] = ["no_routable_agent"];
        return;
      }
      eligible.push({
        campaign_id: row.campaign_id,
        agency_id: row.agency_id,
        name: row.name,
        bid_cents: bid,
        payout_cents: payout,
        buffer_seconds: row.buffer_seconds ?? row.min_connected_seconds ?? 30,
      });
    }),
  );

  eligible.sort((a, b) => a.campaign_id.localeCompare(b.campaign_id));
  return { caller_state: callerState, eligible, rejected };
}
