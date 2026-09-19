import { describe, it, expect, vi, beforeEach } from "vitest";

const eligibilityMock = vi.hoisted(() => vi.fn());
const reserveMock = vi.hoisted(() => vi.fn());
const findByKeyMock = vi.hoisted(() => vi.fn(async (): Promise<unknown> => null));
const setKeyMock = vi.hoisted(() => vi.fn(async () => true));

vi.mock("@/server/services/eligibility", () => ({
  getEligibleOffers: eligibilityMock,
}));

vi.mock("@/server/services/retreaver-rtb", () => ({
  reserveRtbReservation: reserveMock,
}));

vi.mock("@/server/repositories", () => ({
  rtbReservations: {
    findByClientKey: findByKeyMock,
    setClientKey: setKeyMock,
  },
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>, options: unknown) => {
      (globalThis as unknown as { __rtbGuard: unknown }).__rtbGuard = options;
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, {
            ...(ctx as object),
            user: { id: "u-admin", role: "admin" },
            agencyId: "agency-1",
            membership: { id: "m-1" },
          });
        } catch (e: unknown) {
          const err = e as { message?: string; status?: number };
          return actual.fail(err.message ?? "Internal server error", err.status ?? 500);
        }
      };
    },
  };
});

const { POST } = await import("./route");

function post(body: unknown) {
  return POST(
    new Request("http://x/api/v1/rtb/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/v1/rtb/reserve (P1.3)", () => {
  it("is guarded by publishers:manage (same as the direct reservations route)", async () => {
    eligibilityMock.mockResolvedValue({ caller_state: "TX", eligible: [], rejected: {} });
    await post({ publisher_campaign_id: "camp-pub" });
    const guard = (globalThis as unknown as { __rtbGuard: { resource: string; action: string } }).__rtbGuard;
    expect(guard).toMatchObject({ resource: "publishers", action: "manage" });
  });

  it("returns no-target without touching Retreaver when the pool is empty", async () => {
    eligibilityMock.mockResolvedValue({
      caller_state: "TX",
      eligible: [],
      rejected: { "camp-c": ["payout_above_max"] },
    });
    const res = await post({
      publisher_campaign_id: "camp-pub",
      caller_number: "+12145551234",
      publisher_payout_max_cents: 1800,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ status: "no-target", eligible: [] });
    expect(body.data.rejected).toEqual({ "camp-c": ["payout_above_max"] });
    expect(reserveMock).not.toHaveBeenCalled();
  });

  it("makes exactly ONE reserve call for the publisher campaign when buyers are eligible", async () => {
    const eligible = [
      { campaign_id: "camp-a", agency_id: "agency-1", name: "Buyer A", bid_cents: 3500, payout_cents: 1700, buffer_seconds: 30 },
      { campaign_id: "camp-b", agency_id: "agency-1", name: "Buyer B", bid_cents: 3000, payout_cents: 1800, buffer_seconds: 30 },
    ];
    eligibilityMock.mockResolvedValue({ caller_state: "TX", eligible, rejected: {} });
    reserveMock.mockResolvedValue({ id: "res-1", status: "reserved" });
    const res = await post({
      publisher_campaign_id: "camp-pub",
      caller_number: "+12145551234",
      tags: { src: "test" },
    });
    expect(res.status).toBe(201);
    expect(eligibilityMock).toHaveBeenCalledWith({
      publisher_campaign_id: "camp-pub",
      caller_number: "+12145551234",
      caller_state: undefined,
      publisher_payout_min_cents: undefined,
      publisher_payout_max_cents: undefined,
    });
    expect(reserveMock).toHaveBeenCalledTimes(1);
    expect(reserveMock).toHaveBeenCalledWith({
      campaignId: "camp-pub",
      callerNumber: "+12145551234",
      tags: { src: "test" },
    });
    const body = await res.json();
    expect(body.data).toMatchObject({
      status: "reserved",
      eligible_offer_ids: ["camp-a", "camp-b"],
    });
    expect(body.data.reservation).toMatchObject({ id: "res-1" });
  });

  it("rejects invalid bodies with 422", async () => {
    const res = await post({ caller_number: "+12145551234" });
    expect(res.status).toBe(422);
    expect(eligibilityMock).not.toHaveBeenCalled();
    expect(reserveMock).not.toHaveBeenCalled();
  });

  it("dedupes redelivery with the same idempotency key (no re-reserve)", async () => {
    findByKeyMock.mockResolvedValueOnce({ id: "res-orig", status: "reserved", campaign_id: "camp-pub" });
    const res = await post({ publisher_campaign_id: "camp-pub", idempotency_key: "ping-123" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ deduped: true, status: "reserved" });
    expect(body.data.reservation).toMatchObject({ id: "res-orig" });
    expect(eligibilityMock).not.toHaveBeenCalled();
    expect(reserveMock).not.toHaveBeenCalled();
  });

  it("stamps the key after reserving so the next redelivery dedupes", async () => {
    eligibilityMock.mockResolvedValue({
      caller_state: "TX",
      eligible: [{ campaign_id: "camp-a" }],
      rejected: {},
    });
    reserveMock.mockResolvedValue({ id: "res-new", status: "reserved" });
    const res = await post({ publisher_campaign_id: "camp-pub", idempotency_key: "ping-456" });
    expect(res.status).toBe(201);
    expect(setKeyMock).toHaveBeenCalledWith("res-new", "ping-456");
  });

  it("does not stamp the key on no-target (retries re-evaluate fresh)", async () => {
    eligibilityMock.mockResolvedValue({ caller_state: "TX", eligible: [], rejected: {} });
    const first = await post({ publisher_campaign_id: "camp-pub", idempotency_key: "ping-789" });
    expect(first.status).toBe(200);
    const second = await post({ publisher_campaign_id: "camp-pub", idempotency_key: "ping-789" });
    expect(second.status).toBe(200);
    expect(eligibilityMock).toHaveBeenCalledTimes(2);
    expect(setKeyMock).not.toHaveBeenCalled();
  });
});
