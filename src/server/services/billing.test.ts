import { describe, expect, it } from "vitest";
import { calculateBilling } from "./billing";

describe("calculateBilling", () => {
  it("returns zeros when no time connected", () => {
    const r = calculateBilling(0, 30, 10);
    expect(r).toEqual({
      connectedSeconds: 0,
      bufferSeconds: 30,
      billableSeconds: 0,
      totalCents: 0,
    });
  });

  it("subtracts buffer from connected time", () => {
    const r = calculateBilling(100, 30, 10);
    expect(r.billableSeconds).toBe(70);
    expect(r.totalCents).toBe(700);
  });

  it("charges minimum 10 seconds when connected exceeds buffer", () => {
    const r = calculateBilling(31, 30, 10);
    expect(r.billableSeconds).toBe(1);
    expect(r.totalCents).toBe(100);
  });

  it("charges zero when connected is less than buffer", () => {
    const r = calculateBilling(15, 30, 10);
    expect(r.billableSeconds).toBe(0);
    expect(r.totalCents).toBe(0);
  });

  it("charges zero when connected equals buffer", () => {
    const r = calculateBilling(30, 30, 10);
    expect(r.billableSeconds).toBe(0);
    expect(r.totalCents).toBe(0);
  });

  it("uses default buffer of 30 and price of 10", () => {
    const r = calculateBilling(100);
    expect(r.bufferSeconds).toBe(30);
    expect(r.billableSeconds).toBe(70);
    expect(r.totalCents).toBe(700);
  });

  it("respects custom price per second", () => {
    const r = calculateBilling(100, 30, 25);
    expect(r.totalCents).toBe(1750);
  });

  it("handles a full minute call with buffer", () => {
    const r = calculateBilling(90, 30, 10);
    expect(r.billableSeconds).toBe(60);
    expect(r.totalCents).toBe(600);
  });

  it("rounds connected seconds down", () => {
    const r = calculateBilling(45.7, 30, 10);
    expect(r.connectedSeconds).toBeCloseTo(45.7);
    expect(r.billableSeconds).toBeCloseTo(15.7);
    expect(r.totalCents).toBeCloseTo(157);
  });

  it("returns zero total when connected seconds are below minConnectedSeconds threshold", () => {
    const minConnected = 60;
    const connectedSeconds = 15;
    if (connectedSeconds < minConnected) {
      const r = calculateBilling(connectedSeconds, 30, 10);
      expect(r.totalCents).toBe(0);
      expect(r.billableSeconds).toBe(0);
    }
  });

  it("bills correctly when connected seconds just exceed minConnectedSeconds", () => {
    const minConnected = 60;
    const connectedSeconds = 90;
    if (connectedSeconds >= minConnected) {
      const r = calculateBilling(connectedSeconds, 30, 10);
      expect(r.totalCents).toBe(600);
    }
  });
});
