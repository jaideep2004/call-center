import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeE164, hashPhone } from "@/domain/phone";

const { poolQueryMock } = vi.hoisted(() => ({
  poolQueryMock: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  pool: { query: poolQueryMock },
}));

const { tryLinkRetreaverCall, linkRetreaverCalls } = await import("@/server/services/retreaver-link");

describe("normalizeE164 / hashPhone", () => {
  it("normalizes common US formats to the same E.164", () => {
    expect(normalizeE164("(555) 123-4567")).toBe("+15551234567");
    expect(normalizeE164("555-123-4567")).toBe("+15551234567");
    expect(normalizeE164("+1 555 123 4567")).toBe("+15551234567");
    expect(normalizeE164("15551234567")).toBe("+15551234567");
    expect(normalizeE164("+442071234567")).toBe("+442071234567");
    expect(normalizeE164("not a phone")).toBeNull();
  });

  it("hashes the normalized form so one caller matches across formats", () => {
    expect(hashPhone("(555) 123-4567")).toBe(hashPhone("+15551234567"));
    expect(hashPhone("555-123-4567")).toBe(hashPhone("+15551234567"));
    expect(hashPhone("+15551234567")).toHaveLength(64);
  });
});

describe("tryLinkRetreaverCall (opportunistic)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("links both directions when a matching app call exists", async () => {
    poolQueryMock.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "call-1" }] });
    poolQueryMock.mockResolvedValueOnce({ rowCount: 1, rows: [] });
    poolQueryMock.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const linked = await tryLinkRetreaverCall({
      retreaverId: "retr-1",
      callerHash: hashPhone("+15551234567"),
      dialedHash: hashPhone("+15559876543"),
      startTime: "2026-01-01T00:00:00Z",
    });

    expect(linked).toBe(true);
    expect(poolQueryMock).toHaveBeenCalledTimes(3);
    // Matching query uses the pgcrypto digest comparison + 5-min window.
    expect(poolQueryMock.mock.calls[0][0]).toContain("encode(digest(c.to_number, 'sha256'), 'hex')");
    // Both link directions written.
    expect(poolQueryMock.mock.calls[1][0]).toContain("UPDATE app.retreaver_calls SET call_id");
    expect(poolQueryMock.mock.calls[1][1]).toEqual(["call-1", "retr-1"]);
    expect(poolQueryMock.mock.calls[2][0]).toContain("UPDATE app.calls SET retreaver_call_id");
    expect(poolQueryMock.mock.calls[2][1]).toEqual(["retr-1", "call-1"]);
  });

  it("returns false when no app call matches", async () => {
    poolQueryMock.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const linked = await tryLinkRetreaverCall({
      retreaverId: "retr-1",
      callerHash: "x",
      dialedHash: "y",
      startTime: "2026-01-01T00:00:00Z",
    });

    expect(linked).toBe(false);
    expect(poolQueryMock).toHaveBeenCalledTimes(1);
  });
});

describe("linkRetreaverCalls (reconciliation)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("links the temporally nearest unmatched call within the window", async () => {
    poolQueryMock.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: "retr-1",
        caller_hash: hashPhone("+15551234567"),
        dialed_hash: hashPhone("+15559876543"),
        start_time: "2026-01-01T00:00:10Z",
      }],
    });
    poolQueryMock.mockResolvedValueOnce({
      rowCount: 2,
      rows: [
        { id: "call-far", from_hash: hashPhone("+15551234567"), to_number: "+15559876543", started_at: "2026-01-01T00:20:00Z" },
        { id: "call-near", from_hash: hashPhone("+15551234567"), to_number: "+15559876543", started_at: "2026-01-01T00:00:12Z" },
      ],
    });
    poolQueryMock.mockResolvedValueOnce({ rowCount: 1, rows: [] });
    poolQueryMock.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const { linked } = await linkRetreaverCalls();

    expect(linked).toBe(1);
    expect(poolQueryMock.mock.calls[2][1]).toEqual(["call-near", "retr-1"]);
    expect(poolQueryMock.mock.calls[3][1]).toEqual(["retr-1", "call-near"]);
  });

  it("skips matches outside the 5-minute window", async () => {
    poolQueryMock.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: "retr-1",
        caller_hash: hashPhone("+15551234567"),
        dialed_hash: hashPhone("+15559876543"),
        start_time: "2026-01-01T00:00:00Z",
      }],
    });
    poolQueryMock.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: "call-old",
        from_hash: hashPhone("+15551234567"),
        to_number: "+15559876543",
        started_at: "2026-01-01T01:00:00Z",
      }],
    });

    const { linked } = await linkRetreaverCalls();

    expect(linked).toBe(0);
  });

  it("returns 0 when there are no unmatched retreaver records", async () => {
    poolQueryMock.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const { linked } = await linkRetreaverCalls();

    expect(linked).toBe(0);
    expect(poolQueryMock).toHaveBeenCalledTimes(1);
  });
});
