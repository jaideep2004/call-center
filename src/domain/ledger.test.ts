import { describe, expect, it } from "vitest";
import { assertSpendableBalance, walletBalance } from "./ledger";
import type { LedgerEntry } from "./ledger";

const entry = (overrides: Partial<LedgerEntry> = {}): LedgerEntry => ({ id: "1", type: "top_up", amountCents: 10000, reference: "stripe", ...overrides });

describe("walletBalance", () => {
  it("sums positive entries", () => {
    expect(walletBalance([entry(), entry({ id: "2", amountCents: 5000 })])).toBe(15000);
  });

  it("sums negative entries", () => {
    expect(walletBalance([
      entry(),
      entry({ id: "2", type: "charge", amountCents: -3000, reference: "call" }),
    ])).toBe(7000);
  });

  it("returns 0 for empty entries", () => {
    expect(walletBalance([])).toBe(0);
  });

  it("handles mixed entries", () => {
    const entries: LedgerEntry[] = [
      entry({ id: "1", amountCents: 50000 }),
      entry({ id: "2", type: "charge", amountCents: -12000, reference: "call" }),
      entry({ id: "3", type: "refund", amountCents: 2500, reference: "adjust" }),
    ];
    expect(walletBalance(entries)).toBe(40500);
  });
});

describe("assertSpendableBalance", () => {
  it("does not throw when balance is sufficient", () => {
    expect(() => assertSpendableBalance([entry()], 5000)).not.toThrow();
  });

  it("does not throw when balance exactly matches", () => {
    expect(() => assertSpendableBalance([entry()], 10000)).not.toThrow();
  });

  it("throws when balance is insufficient", () => {
    expect(() => assertSpendableBalance([entry()], 15000)).toThrow("Insufficient");
  });

  it("throws for empty wallet", () => {
    expect(() => assertSpendableBalance([], 1)).toThrow("Insufficient");
  });

  it("throws when total is negative", () => {
    expect(() => assertSpendableBalance([entry({ id: "1", type: "charge", amountCents: -500, reference: "fee" })], 100)).toThrow("Insufficient");
  });

  it("throws for non-integer reservation", () => {
    expect(() => assertSpendableBalance([entry()], 1.5)).toThrow("Reservation must be positive integer cents");
  });

  it("throws for zero reservation", () => {
    expect(() => assertSpendableBalance([entry()], 0)).toThrow("Reservation must be positive integer cents");
  });

  it("throws for negative reservation", () => {
    expect(() => assertSpendableBalance([entry()], -100)).toThrow("Reservation must be positive integer cents");
  });

  it("handles large balance with multiple entries", () => {
    const entries = [
      entry({ id: "1", amountCents: 100000 }),
      entry({ id: "2", type: "charge", amountCents: -25000, reference: "call1" }),
      entry({ id: "3", type: "top_up", amountCents: 50000, reference: "stripe" }),
    ];
    expect(() => assertSpendableBalance(entries, 100000)).not.toThrow();
    expect(() => assertSpendableBalance(entries, 125001)).toThrow("Insufficient");
  });
});
