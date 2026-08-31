import { describe, expect, it } from "vitest";
import { formatCents, formatDuration, formatTimer } from "./format";

describe("formatCents", () => {
  it("formats zero", () => expect(formatCents(0)).toBe("$0.00"));
  it("formats whole dollars", () => expect(formatCents(100)).toBe("$1.00"));
  it("formats cents", () => expect(formatCents(99)).toBe("$0.99"));
  it("formats large amounts", () => expect(formatCents(150250)).toBe("$1,502.50"));
  it("formats negative amounts", () => expect(formatCents(-500)).toBe("-$5.00"));
});

describe("formatDuration", () => {
  it("returns em dash for null", () => expect(formatDuration(null)).toBe("\u2014"));
  it("returns em dash for zero", () => expect(formatDuration(0)).toBe("\u2014"));
  it("formats seconds only", () => expect(formatDuration(45)).toBe("45s"));
  it("formats minutes and seconds", () => expect(formatDuration(125)).toBe("2m 5s"));
  it("formats hours and minutes", () => expect(formatDuration(3660)).toBe("1h 1m"));
  it("formats exactly one minute", () => expect(formatDuration(60)).toBe("1m 0s"));
});

describe("formatTimer", () => {
  it("starts at 00:00", () => expect(formatTimer(0)).toBe("00:00"));
  it("formats seconds", () => expect(formatTimer(5)).toBe("00:05"));
  it("formats minutes", () => expect(formatTimer(60)).toBe("01:00"));
  it("formats minutes and seconds", () => expect(formatTimer(125)).toBe("02:05"));
  it("formats hours as minutes", () => expect(formatTimer(3600)).toBe("60:00"));
});
