import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/repositories", () => ({
  walletEntries: { sumEffectiveByAgent: vi.fn() },
  agentSubscriptions: { findActiveByAgent: vi.fn() },
}));

vi.mock("@/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

import { queryOne } from "@/server/db";
import { walletEntries, agentSubscriptions } from "@/server/repositories";
import { fundingStatus, canGoOnline } from "./agent-funding";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(walletEntries.sumEffectiveByAgent).mockResolvedValue(0);
  vi.mocked(agentSubscriptions.findActiveByAgent).mockResolvedValue(null);
  vi.mocked(queryOne).mockResolvedValue(null);
});

describe("funding gate (go-online eligibility)", () => {
  it("funded by positive effective balance alone", async () => {
    vi.mocked(walletEntries.sumEffectiveByAgent).mockResolvedValue(1600);
    const s = await fundingStatus("agent-1");
    expect(s).toEqual({ funded: true, effectiveCents: 1600, hasSubscription: false, agencyPostpaid: false });
    await expect(canGoOnline("agent-1")).resolves.toBe(true);
  });

  it("funded by active subscription with zero balance", async () => {
    vi.mocked(agentSubscriptions.findActiveByAgent).mockResolvedValue({ id: "sub-1" } as never);
    const s = await fundingStatus("agent-1");
    expect(s.funded).toBe(true);
    expect(s.hasSubscription).toBe(true);
  });

  it("unfunded with zero balance and no subscription", async () => {
    const s = await fundingStatus("agent-1");
    expect(s).toEqual({ funded: false, effectiveCents: 0, hasSubscription: false, agencyPostpaid: false });
    await expect(canGoOnline("agent-1")).resolves.toBe(false);
  });

  it("funded by agency postpaid bypass with zero balance and no subscription", async () => {
    vi.mocked(queryOne).mockResolvedValue({ postpaid_bypass: true });
    const s = await fundingStatus("agent-1");
    expect(s).toEqual({ funded: true, effectiveCents: 0, hasSubscription: false, agencyPostpaid: true });
    await expect(canGoOnline("agent-1")).resolves.toBe(true);
  });

  it("fails closed to unfunded when the ledger query throws", async () => {
    vi.mocked(walletEntries.sumEffectiveByAgent).mockRejectedValue(new Error("db down"));
    await expect(canGoOnline("agent-1")).resolves.toBe(false);
  });
});
