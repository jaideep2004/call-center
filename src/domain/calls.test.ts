import { describe, expect, it } from "vitest";
import { assertTransition, isQualifiedCall } from "./calls";

describe("call state machine", () => {
  it("rejects illegal terminal transition", () => {
    expect(() => assertTransition("ended", "routing")).toThrow();
  });

  it("charges only completed qualified calls", () => {
    expect(isQualifiedCall({ state: "ended", connectedSeconds: 60, minConnectedSeconds: 60 })).toBe(true);
  });

  it("allows valid forward transition", () => {
    expect(() => assertTransition("routing", "ringing")).not.toThrow();
  });

  it("allows connected to ended", () => {
    expect(() => assertTransition("connected", "ended")).not.toThrow();
  });

  it("rejects ended to any state", () => {
    expect(() => assertTransition("ended", "connected")).toThrow();
  });

  it("rejects failed to any state", () => {
    expect(() => assertTransition("failed", "routing")).toThrow();
  });

  it("does not charge call below minimum duration", () => {
    expect(isQualifiedCall({ state: "ended", connectedSeconds: 30, minConnectedSeconds: 60 })).toBe(false);
  });

  it("does not charge non-ended states", () => {
    expect(isQualifiedCall({ state: "connected", connectedSeconds: 120, minConnectedSeconds: 60 })).toBe(false);
  });

  it("does not charge missed calls", () => {
    expect(isQualifiedCall({ state: "missed", connectedSeconds: 0, minConnectedSeconds: 60 })).toBe(false);
  });

  it("does not charge cancelled calls", () => {
    expect(isQualifiedCall({ state: "cancelled", connectedSeconds: 0, minConnectedSeconds: 60 })).toBe(false);
  });
});
