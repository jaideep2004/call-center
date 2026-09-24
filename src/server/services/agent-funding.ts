import { queryOne } from "@/server/db";
import { walletEntries, agentSubscriptions } from "@/server/repositories";

export interface FundingStatus {
  funded: boolean;
  effectiveCents: number;
  hasSubscription: boolean;
  agencyPostpaid: boolean;
  /** True when the agent still needs to buy a plan (postpaid agencies exempt). */
  needsSubscription: boolean;
  /** True when the wallet is empty (postpaid agencies exempt). */
  needsTopup: boolean;
}

/**
 * Go-online gate: an agent may only take calls when BOTH funded legs hold —
 * an active plan subscription AND a positive effective wallet balance
 * (personal ledger + pool allocation) — OR the agency-level postpaid flag
 * (admin-set: the whole agency takes calls without prepay). Either leg
 * missing keeps the agent offline; routing separately still skips unfunded
 * agents per call so a depleted wallet stops ringing mid-session.
 */
export async function fundingStatus(agentId: string): Promise<FundingStatus> {
  const [effectiveCents, subscription, agency] = await Promise.all([
    walletEntries.sumEffectiveByAgent(agentId).catch(() => 0),
    agentSubscriptions.findActiveByAgent(agentId).catch(() => null),
    queryOne<{ postpaid_bypass: boolean }>(
      `SELECT ag.postpaid_bypass FROM app.agents a
       JOIN app.agencies ag ON ag.id = a.agency_id
       WHERE a.id = $1`,
      [agentId],
    ).catch(() => null),
  ]);
  const hasSubscription = subscription != null;
  const agencyPostpaid = agency?.postpaid_bypass === true;
  const toppedUp = effectiveCents > 0;
  return {
    funded: agencyPostpaid || (toppedUp && hasSubscription),
    effectiveCents,
    hasSubscription,
    agencyPostpaid,
    needsSubscription: !agencyPostpaid && !hasSubscription,
    needsTopup: !agencyPostpaid && !toppedUp,
  };
}

export async function canGoOnline(agentId: string): Promise<boolean> {
  return (await fundingStatus(agentId)).funded;
}
