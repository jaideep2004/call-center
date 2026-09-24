import { describe, expect, it } from "vitest";
import { SdkCallTracker, isAnswerablePhase, mapSdkPhase } from "./telnyx-call-tracker";

describe("mapSdkPhase", () => {
  it("maps the live states", () => {
    expect(mapSdkPhase("ringing")).toBe("ringing");
    expect(mapSdkPhase("answering")).toBe("answering");
    expect(mapSdkPhase("early")).toBe("early");
    expect(mapSdkPhase("active")).toBe("active");
  });
  it("maps hangup/destroy/purge to ended", () => {
    expect(mapSdkPhase("hangup")).toBe("ended");
    expect(mapSdkPhase("destroy")).toBe("ended");
    expect(mapSdkPhase("purge")).toBe("ended");
  });
  it("never maps the webhook-only 'answered' string to a live phase", () => {
    // Regression: the old hook treated "answered" as connected, but the SDK
    // never emits it — "answered" is a server webhook event name.
    expect(mapSdkPhase("answered")).toBeNull();
  });
  it("ignores unknown/empty states", () => {
    expect(mapSdkPhase("new")).toBeNull();
    expect(mapSdkPhase("")).toBeNull();
    expect(mapSdkPhase(null)).toBeNull();
    expect(mapSdkPhase(undefined)).toBeNull();
  });
  it("is case-insensitive", () => {
    expect(mapSdkPhase("Ringing")).toBe("ringing");
    expect(mapSdkPhase("ACTIVE")).toBe("active");
  });
});

describe("isAnswerablePhase", () => {
  it("allows ringing/answering/early only", () => {
    expect(isAnswerablePhase("ringing")).toBe(true);
    expect(isAnswerablePhase("answering")).toBe(true);
    expect(isAnswerablePhase("early")).toBe(true);
    expect(isAnswerablePhase("active")).toBe(false);
    expect(isAnswerablePhase("idle")).toBe(false);
    expect(isAnswerablePhase("ended")).toBe(false);
  });
});

describe("SdkCallTracker", () => {
  it("tracks ringing then active for one call", () => {
    const t = new SdkCallTracker();
    expect(t.onNotification("sdk-1", "ringing")).toBe(true);
    expect(t.currentCallId).toBe("sdk-1");
    expect(t.currentPhase).toBe("ringing");
    expect(t.decideAnswer()).toEqual({ ok: true, callId: "sdk-1" });
    expect(t.onNotification("sdk-1", "active")).toBe(true);
    expect(t.currentPhase).toBe("active");
    expect(t.decideAnswer().ok).toBe(false);
  });
  it("ignores a previous call's late hangup (the back-to-back race)", () => {
    const t = new SdkCallTracker();
    t.onNotification("sdk-1", "ringing");
    t.onNotification("sdk-1", "active");
    // Call 2 starts ringing while call 1's late hangup is still in flight.
    expect(t.onNotification("sdk-2", "ringing")).toBe(true);
    expect(t.currentCallId).toBe("sdk-2");
    // Late hangup for call 1 must NOT clear call 2.
    expect(t.onNotification("sdk-1", "hangup")).toBe(false);
    expect(t.currentCallId).toBe("sdk-2");
    expect(t.currentPhase).toBe("ringing");
    expect(t.staleCount).toBe(1);
    expect(t.decideAnswer()).toEqual({ ok: true, callId: "sdk-2" });
  });
  it("clears on the matching hangup", () => {
    const t = new SdkCallTracker();
    t.onNotification("sdk-1", "ringing");
    expect(t.onNotification("sdk-1", "hangup")).toBe(true);
    expect(t.currentCallId).toBeNull();
    expect(t.currentPhase).toBe("ended");
    expect(t.decideAnswer()).toEqual({ ok: false, reason: "no-sdk-call", callId: null });
  });
  it("refuses answer with no call", () => {
    const t = new SdkCallTracker();
    expect(t.decideAnswer()).toEqual({ ok: false, reason: "no-sdk-call", callId: null });
  });
});
