import { walletEntries, agentSubscriptions } from "@/server/repositories";

export interface FundingStatus {
  funded: boolean;
  effectiveCents: number;
  hasSubscription: boolean;
}

/**
 * Go-online gate: an agent may only take calls when funded — positive
 * effective wallet balance (personal ledger + pool allocation) OR an active
 * plan subscription. Unfunded agents would receive calls that bill $0 while
 * the publisher still charges the client, so routing skips them AND the
 * availability toggle refuses to go online.
 */
export async function fundingStatus(agentId: string): Promise<FundingStatus> {
  const [effectiveCents, subscription] = await Promise.all([
    walletEntries.sumEffectiveByAgent(agentId).catch(() => 0),
    agentSubscriptions.findActiveByAgent(agentId).catch(() => null),
  ]);
  const hasSubscription = subscription != null;
  return { funded: effectiveCents > 0 || hasSubscription, effectiveCents, hasSubscription };
}

export async function canGoOnline(agentId: string): Promise<boolean> {
  return (await fundingStatus(agentId)).funded;
}
