import { describe, expect, it } from "vitest";

interface Subscription {
  active: boolean;
  remaining: number;
}

// Pure function replicating the call-readiness gate logic
function isCallReady(
  hasActiveSubscription: boolean,
  subscriptionCallsRemaining: number,
  walletBalanceCents: number,
): { eligible: boolean; reason?: string } {
  if (hasActiveSubscription && subscriptionCallsRemaining > 0) {
    return { eligible: true };
  }
  if (walletBalanceCents > 0) {
    return { eligible: true };
  }
  return { eligible: false, reason: "No active subscription or wallet balance" };
}

// Pure function replicating the per-call deduction logic
function deductForCall(
  hasActiveSubscription: boolean,
  subscriptionCallsUsed: number,
  subscriptionAllowance: number,
  walletBalanceCents: number,
): { subscriptionCallsUsed: number; walletBalanceCents: number } {
  if (hasActiveSubscription && subscriptionCallsUsed < subscriptionAllowance) {
    return {
      subscriptionCallsUsed: subscriptionCallsUsed + 1,
      walletBalanceCents,
    };
  }
  return {
    subscriptionCallsUsed,
    walletBalanceCents: walletBalanceCents - 100,
  };
}

describe("agent call-readiness gate", () => {
  it("allows agent with active subscription and remaining calls", () => {
    const result = isCallReady(true, 5, 0);
    expect(result.eligible).toBe(true);
  });

  it("allows agent with positive wallet balance but no subscription", () => {
    const result = isCallReady(false, 0, 500);
    expect(result.eligible).toBe(true);
  });

  it("rejects agent with no subscription and zero balance", () => {
    const result = isCallReady(false, 0, 0);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("rejects agent with expired subscription and zero balance", () => {
    const result = isCallReady(true, 0, 0);
    expect(result.eligible).toBe(false);
  });

  it("allows agent with both subscription and wallet balance", () => {
    const result = isCallReady(true, 10, 1000);
    expect(result.eligible).toBe(true);
  });

  it("allows agent with negative wallet but active subscription", () => {
    const result = isCallReady(true, 3, -500);
    expect(result.eligible).toBe(true);
  });
});

describe("agent per-call deduction", () => {
  it("deducts from subscription when active with remaining allowance", () => {
    const result = deductForCall(true, 5, 100, 0);
    expect(result.subscriptionCallsUsed).toBe(6);
    expect(result.walletBalanceCents).toBe(0);
  });

  it("deducts from wallet when no subscription", () => {
    const result = deductForCall(false, 0, 0, 1000);
    expect(result.subscriptionCallsUsed).toBe(0);
    expect(result.walletBalanceCents).toBe(900);
  });

  it("deducts from wallet when subscription allowance exhausted", () => {
    const result = deductForCall(true, 100, 100, 500);
    expect(result.subscriptionCallsUsed).toBe(100);
    expect(result.walletBalanceCents).toBe(400);
  });

  it("deducts from wallet when no active subscription", () => {
    const result = deductForCall(false, 0, 0, 200);
    expect(result.walletBalanceCents).toBe(100);
  });

  it("handles zero-balance wallet deduction (goes negative)", () => {
    const result = deductForCall(false, 0, 0, 0);
    expect(result.walletBalanceCents).toBe(-100);
  });
});
