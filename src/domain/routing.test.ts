import { describe, expect, it } from "vitest";
import { selectAgent, type AgentCandidate } from "./routing";

const makeAgent = (overrides: Partial<AgentCandidate> = {}): AgentCandidate => ({
  id: "a1", approved: true, available: true, busy: false, walletEligible: true, scheduleOpen: true,
  tier: 1,
  states: ["IL"], licenses: ["P&C"], skills: ["auto"],
  endpointTypes: ["webrtc"], priority: 2, roundRobinRank: 2, ...overrides,
});

const defaultRequest = { state: "IL", requiredLicense: "P&C", requiredSkills: ["auto"], allowedEndpoints: ["webrtc"] as const, strategy: "priority" as const };

describe("selectAgent", () => {
  it("selects lowest priority eligible agent", () => {
    const result = selectAgent([makeAgent(), makeAgent({ id: "a2", priority: 1 })], defaultRequest);
    expect(result.selected?.id).toBe("a2");
  });

  it("keeps an auditable rejection reason", () => {
    const result = selectAgent([makeAgent({ id: "busy", busy: true })], defaultRequest);
    expect(result.selected).toBeUndefined();
    expect(result.rejected.busy).toContain("busy");
  });

  it("rejects unapproved agent", () => {
    const result = selectAgent([makeAgent({ approved: false })], defaultRequest);
    expect(result.selected).toBeUndefined();
  });

  it("rejects unavailable agent", () => {
    const result = selectAgent([makeAgent({ available: false })], defaultRequest);
    expect(result.selected).toBeUndefined();
  });

  it("rejects agent with no wallet eligibility", () => {
    const result = selectAgent([makeAgent({ walletEligible: false })], defaultRequest);
    expect(result.selected).toBeUndefined();
    expect(result.rejected.a1).toContain("wallet_ineligible");
  });

  it("prepaid (tier 1) agents win over postpaid (tier 2) regardless of priority", () => {
    const prepaid = makeAgent({ id: "prepaid", tier: 1, priority: 50 });
    const postpaid = makeAgent({ id: "postpaid", tier: 2, priority: 1 });
    const result = selectAgent([postpaid, prepaid], defaultRequest);
    expect(result.selected?.id).toBe("prepaid");
  });

  it("tier ordering also holds for round_robin strategy", () => {
    const prepaid = makeAgent({ id: "prepaid", tier: 1, roundRobinRank: 99 });
    const postpaid = makeAgent({ id: "postpaid", tier: 2, roundRobinRank: 1 });
    const result = selectAgent([postpaid, prepaid], { ...defaultRequest, strategy: "round_robin" });
    expect(result.selected?.id).toBe("prepaid");
  });

  it("rejects agent outside schedule", () => {
    const result = selectAgent([makeAgent({ scheduleOpen: false })], defaultRequest);
    expect(result.selected).toBeUndefined();
  });

  it("rejects agent not licensed for required state", () => {
    const result = selectAgent([makeAgent({ states: ["CA"] })], defaultRequest);
    expect(result.selected).toBeUndefined();
  });

  it("ignores caller zip (nationwide routing)", () => {
    const agent = makeAgent({ states: [] });
    const result = selectAgent([agent], { ...defaultRequest, state: "CA" });
    expect(result.selected?.id).toBe("a1");
  });

  it("rejects agent without required license", () => {
    const result = selectAgent([makeAgent({ licenses: ["Health"] })], defaultRequest);
    expect(result.selected).toBeUndefined();
  });

  it("rejects agent missing required skills", () => {
    const result = selectAgent([makeAgent({ skills: ["home"] })], defaultRequest);
    expect(result.selected).toBeUndefined();
  });

  it("rejects agent with incompatible endpoint", () => {
    const result = selectAgent([makeAgent({ endpointTypes: ["pstn"] })], defaultRequest);
    expect(result.selected).toBeUndefined();
  });

  it("selects agent with round_robin strategy", () => {
    const agents = [makeAgent({ id: "a1", roundRobinRank: 2 }), makeAgent({ id: "a2", roundRobinRank: 1 })];
    const result = selectAgent(agents, { ...defaultRequest, strategy: "round_robin" });
    expect(result.selected?.id).toBe("a2");
  });

  it("returns no selected agent when none match", () => {
    const result = selectAgent([makeAgent({ states: ["TX"] })], defaultRequest);
    expect(result.selected).toBeUndefined();
  });
});
