import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/repositories", () => ({
  walletEntries: { sumEffectiveByAgent: vi.fn() },
  agentSubscriptions: { findActiveByAgent: vi.fn() },
  agents: { findById: vi.fn() },
  agentCampaignSelections: { getLiveCampaignIds: vi.fn() },
}));

vi.mock("@/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

import { queryOne } from "@/server/db";
import { walletEntries, agentSubscriptions, agents, agentCampaignSelections } from "@/server/repositories";
import { fundingStatus, canGoOnline, onlineBlockers } from "./agent-funding";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(walletEntries.sumEffectiveByAgent).mockResolvedValue(0);
  vi.mocked(agentSubscriptions.findActiveByAgent).mockResolvedValue(null);
  vi.mocked(queryOne).mockResolvedValue(null);
  vi.mocked(agents.findById).mockResolvedValue({
    id: "agent-1", approval_status: "approved", endpoint_types: ["webrtc"],
  } as never);
  vi.mocked(agentCampaignSelections.getLiveCampaignIds).mockResolvedValue(["camp-1"]);
});

describe("funding gate (go-online eligibility)", () => {
  it("funded only with BOTH top-up and subscription", async () => {
    vi.mocked(walletEntries.sumEffectiveByAgent).mockResolvedValue(1600);
    vi.mocked(agentSubscriptions.findActiveByAgent).mockResolvedValue({ id: "sub-1" } as never);
    const s = await fundingStatus("agent-1");
    expect(s).toEqual({ funded: true, effectiveCents: 1600, hasSubscription: true, agencyPostpaid: false, needsSubscription: false, needsTopup: false });
    await expect(canGoOnline("agent-1")).resolves.toBe(true);
  });

  it("blocked with balance but no subscription", async () => {
    vi.mocked(walletEntries.sumEffectiveByAgent).mockResolvedValue(1600);
    const s = await fundingStatus("agent-1");
    expect(s.funded).toBe(false);
    expect(s.needsSubscription).toBe(true);
    expect(s.needsTopup).toBe(false);
    await expect(canGoOnline("agent-1")).resolves.toBe(false);
  });

  it("blocked with subscription but zero balance", async () => {
    vi.mocked(agentSubscriptions.findActiveByAgent).mockResolvedValue({ id: "sub-1" } as never);
    const s = await fundingStatus("agent-1");
    expect(s.funded).toBe(false);
    expect(s.hasSubscription).toBe(true);
    expect(s.needsTopup).toBe(true);
    await expect(canGoOnline("agent-1")).resolves.toBe(false);
  });

  it("unfunded with zero balance and no subscription", async () => {
    const s = await fundingStatus("agent-1");
    expect(s).toEqual({ funded: false, effectiveCents: 0, hasSubscription: false, agencyPostpaid: false, needsSubscription: true, needsTopup: true });
    await expect(canGoOnline("agent-1")).resolves.toBe(false);
  });

  it("funded by agency postpaid bypass with zero balance and no subscription", async () => {
    vi.mocked(queryOne).mockResolvedValue({ postpaid_bypass: true });
    const s = await fundingStatus("agent-1");
    expect(s).toEqual({ funded: true, effectiveCents: 0, hasSubscription: false, agencyPostpaid: true, needsSubscription: false, needsTopup: false });
    await expect(canGoOnline("agent-1")).resolves.toBe(true);
  });

  it("fails closed to unfunded when the ledger query throws", async () => {
    vi.mocked(walletEntries.sumEffectiveByAgent).mockRejectedValue(new Error("db down"));
    await expect(canGoOnline("agent-1")).resolves.toBe(false);
  });
});

describe("onlineBlockers (server go-online checklist)", () => {
  function fundedAgent() {
    vi.mocked(walletEntries.sumEffectiveByAgent).mockResolvedValue(1600);
    vi.mocked(agentSubscriptions.findActiveByAgent).mockResolvedValue({ id: "sub-1" } as never);
  }

  it("returns empty when approval + funding + campaigns + endpoint all hold", async () => {
    fundedAgent();
    await expect(onlineBlockers("agent-1")).resolves.toEqual([]);
  });

  it("blocks unapproved agents first", async () => {
    vi.mocked(agents.findById).mockResolvedValue({ id: "agent-1", approval_status: "pending" } as never);
    const blockers = await onlineBlockers("agent-1");
    expect(blockers.join(" ")).toContain("approval");
  });

  it("names the missing funding leg", async () => {
    const blockers = await onlineBlockers("agent-1");
    expect(blockers.join(" ")).toContain("subscription");
    expect(blockers.join(" ")).toContain("wallet");
  });

  it("blocks agents with no live campaign", async () => {
    fundedAgent();
    vi.mocked(agentCampaignSelections.getLiveCampaignIds).mockResolvedValue([]);
    const blockers = await onlineBlockers("agent-1");
    expect(blockers.join(" ")).toContain("live campaign");
  });

  it("blocks agents with no endpoint", async () => {
    fundedAgent();
    vi.mocked(agents.findById).mockResolvedValue({ id: "agent-1", approval_status: "approved", endpoint_types: [] } as never);
    const blockers = await onlineBlockers("agent-1");
    expect(blockers.join(" ")).toContain("endpoint");
  });
});
