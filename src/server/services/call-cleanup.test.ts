import { describe, it, expect, vi, beforeEach } from "vitest";

const { handleNoAnswerMock, enqueueRouteCallMock, providerCancelMock } = vi.hoisted(() => ({
  handleNoAnswerMock: vi.fn(),
  enqueueRouteCallMock: vi.fn(),
  providerCancelMock: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
}));

vi.mock("@/server/services/call-orchestrator", () => ({
  handleNoAnswer: handleNoAnswerMock,
}));

vi.mock("@/server/services/route-queue", () => ({
  enqueueRouteCall: enqueueRouteCallMock,
}));

vi.mock("@/server/telephony-registry", () => ({
  getTelephonyProvider: vi.fn(() => ({ cancel: providerCancelMock })),
}));

const { expireRingingCalls, requeueStuckRoutingCalls, runCallMaintenance } = await import("@/server/services/call-cleanup");
const db = await import("@/server/db");

function staleRow(overrides: Record<string, unknown> = {}) {
  return { id: "call-1", ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  (db.pool.query as ReturnType<typeof vi.fn>).mockReset();
});

describe("expireRingingCalls", () => {
  it("returns 0 and does nothing when there are no stale calls", async () => {
    (db.pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

    const expired = await expireRingingCalls();

    expect(expired).toBe(0);
    expect(handleNoAnswerMock).not.toHaveBeenCalled();
  });

  it("drives failover via handleNoAnswer for each stale ringing call", async () => {
    (db.pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [staleRow()] });
    handleNoAnswerMock.mockResolvedValue({ rerouted: true, attempts: 1, reason: "timeout" });

    const expired = await expireRingingCalls();

    expect(expired).toBe(1);
    expect(handleNoAnswerMock).toHaveBeenCalledWith("call-1", "timeout");
  });

  it("does not count calls that stopped ringing before the job ran", async () => {
    (db.pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [staleRow()] });
    handleNoAnswerMock.mockResolvedValue(null);

    const expired = await expireRingingCalls();

    expect(expired).toBe(0);
    expect(handleNoAnswerMock).toHaveBeenCalledWith("call-1", "timeout");
  });

  it("keeps processing remaining calls when one fails", async () => {
    handleNoAnswerMock
      .mockRejectedValueOnce(new Error("leg gone"))
      .mockResolvedValueOnce({ rerouted: true, attempts: 1, reason: "timeout" });
    (db.pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      rows: [staleRow({ id: "call-bad" }), staleRow({ id: "call-good" })],
    });

    const expired = await expireRingingCalls();

    expect(expired).toBe(1);
    expect(handleNoAnswerMock).toHaveBeenCalledWith("call-bad", "timeout");
    expect(handleNoAnswerMock).toHaveBeenCalledWith("call-good", "timeout");
  });

  it("selects ringing calls past their per-campaign ring timeout, agent'd only", async () => {
    (db.pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

    await expireRingingCalls();

    // The agent'd timeout SELECT carries the limit param; the orphan net does not.
    const timeoutSelect = (db.pool.query as ReturnType<typeof vi.fn>).mock.calls.find(
      ([sql]: unknown[]) => String(sql).includes("ring_timeout_seconds"),
    );
    expect(timeoutSelect).toBeTruthy();
    expect(String(timeoutSelect?.[0])).toContain("c.state = 'ringing'");
    expect(String(timeoutSelect?.[0])).toContain("c.agent_id IS NOT NULL");
    expect(timeoutSelect?.[1]).toEqual([25]);
    // The orphan sweep excludes recent in-flight dials (grace period).
    expect(db.pool.query).toHaveBeenCalledWith(expect.stringContaining("interval '45 seconds'"));
  });
});

describe("requeueStuckRoutingCalls", () => {
  function stuckRow(overrides: Record<string, unknown> = {}) {
    return {
      id: "call-1",
      provider: "mock",
      provider_call_id: "caller-leg-1",
      routing_snapshot: {},
      ...overrides,
    };
  }

  it("re-enqueues stuck routing calls and bumps the requeue counter", async () => {
    (db.pool.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [stuckRow()] })
      .mockResolvedValueOnce({ rows: [] });
    enqueueRouteCallMock.mockResolvedValue(undefined);

    const result = await requeueStuckRoutingCalls();

    expect(result).toEqual({ requeued: 1, stuckFailed: 0 });
    expect(enqueueRouteCallMock).toHaveBeenCalledWith("call-1");
    // routing_snapshot is bumped with routing_requeues: 1 via the $2 JSON param.
    const bumpCall = (db.pool.query as ReturnType<typeof vi.fn>).mock.calls.find(
      ([sql]: unknown[]) => String(sql).includes("SET routing_snapshot"),
    );
    expect(bumpCall).toBeTruthy();
    expect(JSON.parse(bumpCall?.[1]?.[1] as string)).toMatchObject({ routing_requeues: 1 });
  });

  it("gives up and cancels the caller leg once max attempts are exhausted", async () => {
    (db.pool.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [stuckRow({ routing_snapshot: { routing_requeues: 3 } })] })
      .mockResolvedValueOnce({ rows: [{ id: "call-1" }] });
    providerCancelMock.mockResolvedValue(undefined);

    const result = await requeueStuckRoutingCalls({ maxAttempts: 3 });

    expect(result).toEqual({ requeued: 0, stuckFailed: 1 });
    expect(enqueueRouteCallMock).not.toHaveBeenCalled();
    expect(providerCancelMock).toHaveBeenCalledWith({ providerAttemptId: "caller-leg-1" });
  });

  it("skips a stuck call that already moved on", async () => {
    (db.pool.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rows: [stuckRow({ routing_snapshot: { routing_requeues: 3 } })] })
      .mockResolvedValueOnce({ rows: [] }); // miss claim returned 0 rows

    const result = await requeueStuckRoutingCalls({ maxAttempts: 3 });

    expect(result).toEqual({ requeued: 0, stuckFailed: 0 });
    expect(providerCancelMock).not.toHaveBeenCalled();
  });

  it("runs the requeue sweep under a max-age cursor and a batch limit", async () => {
    (db.pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

    await requeueStuckRoutingCalls({ maxAgeSeconds: 90, limit: 25 });

    expect(db.pool.query).toHaveBeenCalledWith(
      expect.stringContaining("state = 'routing'"),
      expect.arrayContaining([90, 25]),
    );
  });
});

describe("runCallMaintenance", () => {
  it("skips when another instance holds the advisory lock", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [{ ok: false }] }),
      release: vi.fn(),
    };
    (db.pool.connect as ReturnType<typeof vi.fn>).mockResolvedValue(client);

    const result = await runCallMaintenance();

    expect(result).toEqual({ expired: 0, requeued: 0, stuckFailed: 0, skipped: true });
    expect(handleNoAnswerMock).not.toHaveBeenCalled();
    expect(enqueueRouteCallMock).not.toHaveBeenCalled();
  });

  it("runs the sweep when it wins the lock", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [{ ok: true }] }),
      release: vi.fn(),
    };
    (db.pool.connect as ReturnType<typeof vi.fn>).mockResolvedValue(client);
    // Both sweep functions fetch no rows.
    (db.pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

    const result = await runCallMaintenance();

    expect(result).toEqual({ expired: 0, requeued: 0, stuckFailed: 0, skipped: false });
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("pg_try_advisory_lock"), expect.anything());
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("pg_advisory_unlock"), expect.anything());
    expect(client.release).toHaveBeenCalled();
    expect(handleNoAnswerMock).not.toHaveBeenCalled();
  });
});