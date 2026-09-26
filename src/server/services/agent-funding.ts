import { queryOne } from "@/server/db";
import { walletEntries, agentSubscriptions, agents, agentCampaignSelections } from "@/server/repositories";

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

/**
 * Full server-checkable go-online checklist (everything except the
 * per-browser mic+speaker test, which only the client can verify and which
 * the header/sidebar toggles enforce from localStorage). PATCH availability
 * gates on this, so header toggles, Take Calls, and API clients all share
 * one verdict. Returns human-readable blockers, empty when clear.
 */
export async function onlineBlockers(agentId: string): Promise<string[]> {
  const blockers: string[] = [];
  const agent = await agents.findById(agentId).catch(() => null);
  if (!agent) return ["agent profile not found"];
  if (agent.approval_status !== "approved") {
    return [`awaiting admin approval (status: ${agent.approval_status})`];
  }
  const status = await fundingStatus(agentId);
  if (!status.funded) {
    if (status.needsSubscription && status.needsTopup) {
      blockers.push("an active subscription plan AND a topped-up wallet");
    } else if (status.needsSubscription) {
      blockers.push("an active subscription plan");
    } else {
      blockers.push("a topped-up wallet");
    }
  }
  const live = await agentCampaignSelections.getLiveCampaignIds(agentId).catch(() => [] as string[]);
  if (live.length === 0) {
    blockers.push("at least one live campaign (Take Calls → Live Campaigns)");
  }
  const eps = (agent.endpoint_types ?? []) as string[];
  const hasWebrtc = eps.includes("webrtc");
  const hasPstn = eps.includes("pstn") || eps.includes("phone");
  if (!hasWebrtc && !hasPstn) {
    blockers.push("a call endpoint (contact admin to configure one)");
  } else if (!hasWebrtc && !agent.forwarding_number) {
    blockers.push("a forwarding number for the PSTN endpoint");
  }
  return blockers;
}
