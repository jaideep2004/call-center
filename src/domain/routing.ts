export type RoutingStrategy = "priority" | "round_robin";

export interface AgentCandidate {
  id: string;
  approved: boolean;
  available: boolean;
  busy: boolean;
  walletEligible: boolean;
  scheduleOpen: boolean;
  /** Funding tier: 1 = prepaid (wallet-funded, gets calls FIRST), 2 = postpaid (subscription). */
  tier: number;
  states: readonly string[];
  licenses: readonly string[];
  skills: readonly string[];
  endpointTypes: ReadonlyArray<"webrtc" | "pstn">;
  priority: number;
  roundRobinRank: number;
}

export interface RoutingRequest {
  state: string;
  requiredLicense?: string;
  requiredSkills: readonly string[];
  allowedEndpoints: ReadonlyArray<"webrtc" | "pstn">;
  strategy: RoutingStrategy;
}

export interface RoutingResult {
  selected?: AgentCandidate;
  rejected: Record<string, string[]>;
}

function reasons(agent: AgentCandidate, request: RoutingRequest) {
  const rejected: string[] = [];
  if (!agent.approved) rejected.push("not_approved");
  if (!agent.available) rejected.push("unavailable");
  if (agent.busy) rejected.push("busy");
  if (!agent.walletEligible) rejected.push("wallet_ineligible");
  if (!agent.scheduleOpen) rejected.push("outside_schedule");
  if (agent.states.length && !agent.states.includes(request.state)) rejected.push("state_mismatch");
  if (request.requiredLicense && !agent.licenses.includes(request.requiredLicense)) rejected.push("license_missing");
  if (agent.skills.length > 0 && request.requiredSkills.some((skill) => !agent.skills.includes(skill))) rejected.push("skill_missing");
  if (!agent.endpointTypes.some((type) => request.allowedEndpoints.includes(type)) && agent.endpointTypes.length > 0) rejected.push("endpoint_unavailable");
  return rejected;
}

export function selectAgent(candidates: AgentCandidate[], request: RoutingRequest): RoutingResult {
  const rejected: Record<string, string[]> = {};
  const eligible = candidates.filter((agent) => {
    const failed = reasons(agent, request);
    if (failed.length) rejected[agent.id] = failed;
    return failed.length === 0;
  });
  const ordered = [...eligible].sort((a, b) => {
    // Prepaid agents ALWAYS get the call first (client rule), regardless of strategy.
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (request.strategy === "round_robin") return a.roundRobinRank - b.roundRobinRank || a.priority - b.priority;
    return a.priority - b.priority || a.roundRobinRank - b.roundRobinRank;
  });
  return { selected: ordered[0], rejected };
}
