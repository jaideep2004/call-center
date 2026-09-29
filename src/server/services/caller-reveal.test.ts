import { describe, it, expect, vi } from "vitest";

vi.mock("@/server/crypto", () => ({
  encryptSecret: vi.fn((s: string) => `enc:${s}`),
  decryptSecret: vi.fn((s: string) => {
    if (!s.startsWith("enc:")) throw new Error("Malformed encrypted secret");
    return s.slice(4);
  }),
}));

const { connectedSecondsOf, callerRevealFor } = await import("./caller-reveal");

const base = {
  connected_at: "2026-09-26T10:00:00.000Z",
  ended_at: "2026-09-26T10:02:00.000Z",
  caller_number_encrypted: "enc:+15551234567",
};

describe("caller reveal gate (Option A escrow)", () => {
  it("stays masked before the buffer is crossed", async () => {
    const out = callerRevealFor({ ...base, ended_at: "2026-09-26T10:00:20.000Z" }, 30);
    expect(out).toEqual({ revealed: false, caller_number: null });
  });

  it("reveals once connected seconds exceed the buffer", async () => {
    const out = callerRevealFor(base, 30);
    expect(out).toEqual({ revealed: true, caller_number: "+15551234567" });
  });

  it("reveals live calls already past the buffer", async () => {
    const out = callerRevealFor(
      { connected_at: new Date(Date.now() - 120_000).toISOString(), ended_at: null, caller_number_encrypted: "enc:+1" },
      30,
    );
    expect(out.revealed).toBe(true);
  });

  it("stays masked without escrow (old rows) or without connection", async () => {
    expect(callerRevealFor({ ...base, caller_number_encrypted: null }, 30).revealed).toBe(false);
    expect(callerRevealFor({ connected_at: null, ended_at: null, caller_number_encrypted: "enc:+1" }, 30).revealed).toBe(false);
  });

  it("stays masked when decryption fails", async () => {
    const out = callerRevealFor({ ...base, caller_number_encrypted: "corrupt" }, 30);
    expect(out).toEqual({ revealed: false, caller_number: null });
  });

  it("measures zero at exactly the buffer boundary", async () => {
    const out = callerRevealFor({ ...base, ended_at: "2026-09-26T10:00:30.000Z" }, 30);
    expect(out.revealed).toBe(false);
  });

  it("connectedSecondsOf handles live and ended calls", async () => {
    expect(connectedSecondsOf({ connected_at: null, ended_at: null })).toBe(0);
    expect(connectedSecondsOf(base)).toBe(120);
  });
});
