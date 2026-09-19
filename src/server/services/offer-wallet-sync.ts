import { query } from "@/server/db";
import { retreaver } from "@/domain/providers/retreaver";
import { findRoutableAgentId } from "@/server/services/ping-evaluator";
import { bidOverrides } from "@/server/repositories";

interface SyncOfferRow {
  id: string;
  agency_id: string;
  name: string;
  price_cents: number | null;
  retreaver_cid: string | null;
}

export interface OfferWalletSyncResult {
  checked: number;
  paused: string[];
  unpaused: string[];
  skipped: string[];
}

/**
 * Wallet sync (P1.4): pause/unpause RTB buyer offers in Retreaver based on
 * EFFECTIVE funding. An offer is paused when NO agent in its agency can take
 * it at any state (approved + available + live + effective balance covers the
 * effective bid, IGNORING busy — busy is transient and must not flap Retreaver
 * state; the ping-time gate still enforces not-busy on every call).
 *
 * Runs every 30s via pg-boss plus fire-and-forget after pool/allocations
 * writes. Retreaver PUTs happen only on state change (current state read via
 * getCampaign first), so steady state is GET-only. When Retreaver is not
 * configured the provider calls are skipped but local evaluation still runs
 * (returned in the result for observability).
 *
 * Correctness never depends on this job: every ping enforces the effective
 * balance in real time via findRoutableAgentId. This job is the RTB-side
 * enforcement so depleted buyers stop receiving publisher traffic.
 */
export async function syncOfferWalletPauses(agencyId?: string): Promise<OfferWalletSyncResult> {
  const result: OfferWalletSyncResult = { checked: 0, paused: [], unpaused: [], skipped: [] };
  const params: unknown[] = [];
  let agencyClause = "";
  if (agencyId) {
    params.push(agencyId);
    agencyClause = `AND c.agency_id = $1`;
  }
  const offers = await query<SyncOfferRow>(
    `SELECT c.id, c.agency_id, c.name, c.price_cents, c.retreaver_cid
       FROM app.campaigns c
      WHERE c.deleted_at IS NULL
        AND c.status = 'active'
        AND c.rtb_enabled = true
        ${agencyClause}
      ORDER BY c.created_at ASC`,
    params,
  );

  for (const offer of offers) {
    result.checked += 1;
    if (!offer.retreaver_cid) {
      result.skipped.push(offer.id);
      continue;
    }
    const override = await bidOverrides.findLatest(offer.id).catch(() => null);
    const bidCents = override?.price_cents ?? offer.price_cents ?? 0;
    const fundedAgentId = await findRoutableAgentId({
      agencyId: offer.agency_id,
      campaignId: offer.id,
      state: null,
      priceCents: bidCents,
      ignoreBusy: true,
    });
    const wantPaused = !fundedAgentId;
    if (!retreaver.configured()) {
      (wantPaused ? result.paused : result.unpaused).push(offer.id);
      continue;
    }
    let current: { paused?: boolean } | null = null;
    try {
      current = await retreaver.getCampaign(offer.retreaver_cid);
    } catch (error) {
      console.warn(`[offer-wallet-sync] getCampaign failed for ${offer.retreaver_cid}: ${String(error).slice(0, 160)}`);
      result.skipped.push(offer.id);
      continue;
    }
    if (Boolean(current?.paused) === wantPaused) continue;
    try {
      await retreaver.setCampaignPaused(offer.retreaver_cid, wantPaused);
      (wantPaused ? result.paused : result.unpaused).push(offer.id);
    } catch (error) {
      console.warn(`[offer-wallet-sync] setCampaignPaused failed for ${offer.retreaver_cid}: ${String(error).slice(0, 160)}`);
      result.skipped.push(offer.id);
    }
  }
  return result;
}
