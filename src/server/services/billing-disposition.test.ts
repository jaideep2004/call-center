import { describe, expect, it } from "vitest";

// Pure function that simulates the disposition-based billing logic in finalizeCall
function calculateDispositionBilling(
  connectedSeconds: number,
  minConnectedSeconds: number,
  dispositionConfirmed: boolean,
  payoutCents: number,
  fallbackPriceCents: number,
  fallbackBufferSeconds: number,
) {
  if (connectedSeconds < minConnectedSeconds) {
    return { totalCents: 0, method: "below_minimum" as const };
  }

  if (dispositionConfirmed) {
    return { totalCents: payoutCents, method: "disposition" as const };
  }

  const billable = Math.max(0, connectedSeconds - fallbackBufferSeconds);
  const total = Math.max(
    billable * fallbackPriceCents,
    billable > 0 ? fallbackPriceCents * 10 : 0,
  );
  return { totalCents: total, method: "per_second" as const };
}

describe("disposition billing logic", () => {
  it("uses payout when disposition is confirmed", () => {
    const result = calculateDispositionBilling(120, 0, true, 500, 10, 30);
    expect(result.method).toBe("disposition");
    expect(result.totalCents).toBe(500);
  });

  it("falls back to per-second when no disposition", () => {
    const result = calculateDispositionBilling(120, 0, false, 0, 10, 30);
    expect(result.method).toBe("per_second");
    expect(result.totalCents).toBe(900);
  });

  it("returns zero below minimum connected seconds regardless of disposition", () => {
    const result = calculateDispositionBilling(5, 60, true, 500, 10, 30);
    expect(result.method).toBe("below_minimum");
    expect(result.totalCents).toBe(0);
  });

  it("returns zero payout when disposition confirmed but no payout configured", () => {
    const result = calculateDispositionBilling(120, 0, true, 0, 10, 30);
    expect(result.method).toBe("disposition");
    expect(result.totalCents).toBe(0);
  });
});
