import { queryOne } from "@/server/db";
import { walletEntries, agentSubscriptions } from "@/server/repositories";

export interface FundingStatus {
  funded: boolean;
  effectiveCents: number;
  hasSubscription: boolean;
  agencyPostpaid: boolean;
}

/**
 * Go-online gate: an agent may only take calls when funded — positive
 * effective wallet balance (personal ledger + pool allocation), an active
 * plan subscription, OR a postpaid agency flag (admin-set: the whole agency
 * takes calls without prepay). Unfunded agents would receive calls that bill
 * $0 while the publisher still charges the client, so routing skips them AND
 * the availability toggle refuses to go online.
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
  return {
    funded: effectiveCents > 0 || hasSubscription || agencyPostpaid,
    effectiveCents,
    hasSubscription,
    agencyPostpaid,
  };
}

export async function canGoOnline(agentId: string): Promise<boolean> {
  return (await fundingStatus(agentId)).funded;
}
