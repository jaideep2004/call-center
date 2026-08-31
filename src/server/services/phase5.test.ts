import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { encryptSecret, decryptSecret } from "@/server/crypto";

vi.mock("@/domain/providers/retreaver", () => {
  class RetreaverError extends Error {
    status: number;
    provider: string;
    constructor(message: string, status: number, provider: string) {
      super(message);
      this.status = status;
      this.provider = provider;
    }
  }
  return {
    RetreaverError,
    retreaver: {
      configured: vi.fn(() => true),
      createAffiliate: vi.fn(),
      updateAffiliate: vi.fn(),
      reserveRtb: vi.fn(),
      confirmRtb: vi.fn(),
      fetchCalls: vi.fn(),
      checkConnection: vi.fn(),
    },
  };
});

vi.mock("@/server/repositories", () => ({
  publishers: {
    findById: vi.fn(),
    findByAfid: vi.fn(),
    update: vi.fn(),
    updateRetreaverStatus: vi.fn(),
  },
  campaigns: {
    findById: vi.fn(),
    findByRetreaverCid: vi.fn(),
    findByPublisher: vi.fn(),
    linkRetreaverCid: vi.fn(),
  },
  bidOverrides: { findLatest: vi.fn().mockResolvedValue(null) },
  phoneNumbers: { findByE164: vi.fn(), findByCampaign: vi.fn() },
  retreaverCalls: {
    latestSyncedAt: vi.fn(),
    upsertByUuid: vi.fn(),
  },
  rtbReservations: {
    create: vi.fn(),
    findById: vi.fn(),
    findByCampaign: vi.fn(),
    setStatus: vi.fn(),
    findExpiredReserved: vi.fn(),
    eventsFor: vi.fn(),
  },
}));

const { retreaver } = await import("@/domain/providers/retreaver");
const repos = await import("@/server/repositories");
const { provisionPublisher, setPublisherStatus, syncRetreaverCalls, checkRetreaverConnection, handleRetreaverWebhook } = await import("./retreaver");
const { reserveRtbReservation, confirmRtbReservation, expireStaleRtbReservations } = await import("./retreaver-rtb");

process.env.ENCRYPTION_KEY = "test-encryption-key";
process.env.RETREAVER_WEBHOOK_SECRET = "test-webhook-secret";

describe("crypto secrets", () => {
  const original = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "test-encryption-key";
  });

  afterAll(() => {
    if (original === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = original;
  });

  it("round-trips a postback key", () => {
    const encrypted = encryptSecret("rtb-key-12345");
    expect(encrypted).not.toContain("rtb-key-12345");
    expect(decryptSecret(encrypted)).toBe("rtb-key-12345");
  });

  it("produces unique ciphertext per call", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("rejects malformed payloads", () => {
    expect(() => decryptSecret("not-a-valid-payload")).toThrow();
  });
});

describe("retreaver connection status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports not configured when env vars are missing", async () => {
    (retreaver.configured as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const status = await checkRetreaverConnection();
    expect(status.ok).toBe(false);
    expect(status.message).toContain("not configured");
    expect(retreaver.checkConnection).not.toHaveBeenCalled();
  });

  it("reports connected with latency", async () => {
    (retreaver.configured as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (retreaver.checkConnection as ReturnType<typeof vi.fn>).mockResolvedValue({ latencyMs: 142 });
    const status = await checkRetreaverConnection();
    expect(status.ok).toBe(true);
    expect(status.latency_ms).toBe(142);
    expect(status.message).toBe("Connected");
  });

  it("maps auth errors to a readable message", async () => {
    (retreaver.configured as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const { RetreaverError } = await import("@/domain/providers/retreaver");
    (retreaver.checkConnection as ReturnType<typeof vi.fn>).mockRejectedValue(
      new RetreaverError("boom", 401, "retreaver"),
    );
    const status = await checkRetreaverConnection();
    expect(status.ok).toBe(false);
    expect(status.message).toBe("invalid API key");
  });

  it("maps company mismatches to a readable message", async () => {
    (retreaver.configured as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const { RetreaverError } = await import("@/domain/providers/retreaver");
    (retreaver.checkConnection as ReturnType<typeof vi.fn>).mockRejectedValue(
      new RetreaverError("boom", 403, "retreaver"),
    );
    const status = await checkRetreaverConnection();
    expect(status.ok).toBe(false);
    expect(status.message).toContain("company_id");
  });
});

describe("publisher provisioning", () => {
  const publisher = {
    id: "pub-1",
    name: "Test Publisher",
    email: null,
    afid: null,
    commission_pct: 0,
    fixed_price_cents: 2500,
    retreaver_status: "unprovisioned",
    active: true,
    created_at: "2026-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (repos.publishers.findById as ReturnType<typeof vi.fn>).mockResolvedValue(publisher);
    (repos.publishers.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ...publisher, afid: "pub-1", retreaver_status: "active" });
  });

  it("creates an affiliate using the publisher id as afid", async () => {
    (retreaver.createAffiliate as ReturnType<typeof vi.fn>).mockResolvedValue({ afid: "pub-1", first_name: null, last_name: null, company_name: "Test Publisher" });
    await provisionPublisher("pub-1");
    expect(retreaver.createAffiliate).toHaveBeenCalledWith({ afid: "pub-1", company_name: "Test Publisher" });
    expect(repos.publishers.update).toHaveBeenCalledWith("pub-1", { afid: "pub-1", retreaver_status: "active" });
  });

  it("updates an existing affiliate when already provisioned", async () => {
    const existing = { ...publisher, afid: "old-afid", retreaver_status: "active" };
    (repos.publishers.findById as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (retreaver.updateAffiliate as ReturnType<typeof vi.fn>).mockResolvedValue({ afid: "old-afid", first_name: null, last_name: null, company_name: "Test Publisher" });
    await provisionPublisher("pub-1");
    expect(retreaver.updateAffiliate).toHaveBeenCalledWith("old-afid", { company_name: "Test Publisher" });
    expect(retreaver.createAffiliate).not.toHaveBeenCalled();
  });

  it("marks the publisher in error when Retreaver fails", async () => {
    (retreaver.createAffiliate as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    await expect(provisionPublisher("pub-1")).rejects.toThrow("boom");
    expect(repos.publishers.update).toHaveBeenCalledWith("pub-1", { retreaver_status: "error" });
  });
});

describe("publisher status", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects activation before provisioning", async () => {
    (repos.publishers.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "pub-1", name: "P", email: null, afid: null, commission_pct: 0,
      fixed_price_cents: null, retreaver_status: "unprovisioned", active: true, created_at: "",
    });
    await expect(setPublisherStatus("pub-1", "active")).rejects.toThrow("provisioned");
  });

  it("pauses a provisioned publisher", async () => {
    (repos.publishers.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "pub-1", name: "P", email: null, afid: "a1", commission_pct: 0,
      fixed_price_cents: null, retreaver_status: "active", active: true, created_at: "",
    });
    await setPublisherStatus("pub-1", "paused");
    expect(repos.publishers.updateRetreaverStatus).toHaveBeenCalledWith("pub-1", "paused");
  });
});

describe("retreaver call sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (repos.retreaverCalls.latestSyncedAt as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (repos.campaigns.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "camp-1", agency_id: "agency-1", name: "A", status: "active",
      routing_strategy: "round_robin", price_cents: 4500, min_connected_seconds: 10,
      buffer_seconds: 0, allowed_endpoints: [], target_states: [], target_zip_prefixes: [],
      required_license: null, required_skills: [], record_calls: true, consent_policy: {},
      publisher_id: "pub-1", rtb_enabled: false, rtb_postback_key_encrypted: null,
      retreaver_cid: null,
    });
  });

  it("stores fetched calls with resolved agency and publisher", async () => {
    (retreaver.fetchCalls as ReturnType<typeof vi.fn>).mockResolvedValue({
      calls: [
        {
          uuid: "call-1", caller: "+15550001111", caller_zip: null, caller_state: null,
          caller_city: null, caller_country: null, afid: "pub-1", cid: null, sid: null,
          dialed_number: "+18005551234", status: "finished", connected: true, converted: true,
          payout: 2.5, revenue: 12, profit_gross: null, profit_net: null, total_duration: 60,
          recording_url: null, tags: null, start_time: null, end_time: null, created_at: null, updated_at: null,
        },
      ],
      nextPage: null,
    });
    (repos.phoneNumbers.findByE164 as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "n1", agency_id: "agency-1", campaign_id: "camp-1", provider: "telnyx", e164: "+18005551234", status: "active",
    });
    (repos.publishers.findByAfid as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "pub-1", name: "P", email: null, afid: "pub-1", commission_pct: 0,
      fixed_price_cents: null, retreaver_status: "active", active: true, created_at: "",
    });

    const result = await syncRetreaverCalls();

    expect(result).toEqual({ stored: 1, skipped: 0, truncated: false });
    expect(repos.retreaverCalls.upsertByUuid).toHaveBeenCalledWith(
      expect.objectContaining({
        uuid: "call-1", agencyId: "agency-1", campaignId: "camp-1", publisherId: "pub-1",
        payoutCents: 250, revenueCents: 1200, connected: true,
      }),
    );
  });

  it("skips calls that cannot be attributed to a number", async () => {
    (retreaver.fetchCalls as ReturnType<typeof vi.fn>).mockResolvedValue({
      calls: [
        {
          uuid: "call-2", caller: null, caller_zip: null, caller_state: null, caller_city: null,
          caller_country: null, afid: null, cid: null, sid: null, dialed_number: "+19999999999",
          status: "finished", connected: false, converted: false, payout: null, revenue: null,
          profit_gross: null, profit_net: null, total_duration: 0, recording_url: null, tags: null,
          start_time: null, end_time: null, created_at: null, updated_at: null,
        },
      ],
      nextPage: null,
    });
    (repos.phoneNumbers.findByE164 as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (repos.publishers.findByAfid as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await syncRetreaverCalls();

    expect(result).toEqual({ stored: 0, skipped: 1, truncated: false });
    expect(repos.retreaverCalls.upsertByUuid).not.toHaveBeenCalled();
  });

  it("caps the history scan when nothing has been synced before", async () => {
    (retreaver.fetchCalls as ReturnType<typeof vi.fn>).mockResolvedValue({ calls: [], nextPage: 2 });
    const result = await syncRetreaverCalls({ maxPages: 3 });
    expect(result.truncated).toBe(true);
    expect(retreaver.fetchCalls).toHaveBeenCalledTimes(3);
    const firstCall = (retreaver.fetchCalls as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(firstCall.updated_at_start).toBeTruthy();
    expect(firstCall.per_page).toBe(100);
  });
});

describe("retreaver call attribution via cid", () => {
  const campaign = {
    id: "camp-1", agency_id: "agency-1", name: "Campaign A", status: "active",
    routing_strategy: "round_robin", price_cents: 4500, min_connected_seconds: 10,
    buffer_seconds: 0, allowed_endpoints: [], target_states: [], target_zip_prefixes: [],
    required_license: null, required_skills: [], record_calls: true, consent_policy: {},
    publisher_id: "pub-1", rtb_enabled: false, rtb_postback_key_encrypted: null,
    retreaver_cid: null,
  };
  const otherCampaign = { ...campaign, id: "camp-2", name: "Campaign B" };
  const publisher = {
    id: "pub-1", name: "P", email: null, afid: "pub-1", commission_pct: 0,
    fixed_price_cents: 2500, retreaver_status: "active", active: true, created_at: "",
  };
  const call = (overrides: Record<string, unknown> = {}) => ({
    uuid: "call-3", caller: "+15550001111", caller_zip: null, caller_state: null,
    caller_city: null, caller_country: null, afid: "pub-1", cid: "9872", sid: null,
    dialed_number: "+19999999999", status: "finished", connected: true, converted: true,
    payout: 25, revenue: 45, profit_gross: null, profit_net: null, total_duration: 60,
    recording_url: null, tags: null, start_time: null, end_time: null, created_at: null,
    updated_at: null,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (repos.retreaverCalls.latestSyncedAt as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (repos.publishers.findByAfid as ReturnType<typeof vi.fn>).mockResolvedValue(publisher);
    (repos.phoneNumbers.findByE164 as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (repos.campaigns.findByRetreaverCid as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (repos.campaigns.findByPublisher as ReturnType<typeof vi.fn>).mockResolvedValue([campaign]);
    (repos.campaigns.linkRetreaverCid as ReturnType<typeof vi.fn>).mockResolvedValue({ ...campaign, retreaver_cid: "9872" });
  });

  it("attributes by cid when the dialed number is not ours", async () => {
    (repos.campaigns.findByRetreaverCid as ReturnType<typeof vi.fn>).mockResolvedValue({ ...campaign, retreaver_cid: "9872" });
    (retreaver.fetchCalls as ReturnType<typeof vi.fn>).mockResolvedValue({ calls: [call()], nextPage: null });

    const result = await syncRetreaverCalls();

    expect(result).toEqual({ stored: 1, skipped: 0, truncated: false });
    expect(repos.retreaverCalls.upsertByUuid).toHaveBeenCalledWith(
      expect.objectContaining({ uuid: "call-3", agencyId: "agency-1", campaignId: "camp-1", publisherId: "pub-1" }),
    );
  });

  it("auto-links cid to the single campaign of the publisher and stores the call", async () => {
    (retreaver.fetchCalls as ReturnType<typeof vi.fn>).mockResolvedValue({ calls: [call()], nextPage: null });

    await syncRetreaverCalls();

    expect(repos.campaigns.findByPublisher).toHaveBeenCalledWith("pub-1");
    expect(repos.campaigns.linkRetreaverCid).toHaveBeenCalledWith("camp-1", "9872");
    expect(repos.retreaverCalls.upsertByUuid).toHaveBeenCalledWith(
      expect.objectContaining({ uuid: "call-3", campaignId: "camp-1" }),
    );
  });

  it("does not relink when the campaign already has a cid", async () => {
    (repos.campaigns.findByRetreaverCid as ReturnType<typeof vi.fn>).mockResolvedValue({ ...campaign, retreaver_cid: "9872" });
    (retreaver.fetchCalls as ReturnType<typeof vi.fn>).mockResolvedValue({ calls: [call()], nextPage: null });

    await syncRetreaverCalls();

    expect(repos.campaigns.linkRetreaverCid).not.toHaveBeenCalled();
  });

  it("skips calls when the publisher has multiple campaigns and cid is unknown", async () => {
    (repos.campaigns.findByPublisher as ReturnType<typeof vi.fn>).mockResolvedValue([campaign, otherCampaign]);
    (retreaver.fetchCalls as ReturnType<typeof vi.fn>).mockResolvedValue({ calls: [call({ cid: null })], nextPage: null });

    const result = await syncRetreaverCalls();

    expect(result).toEqual({ stored: 0, skipped: 1, truncated: false });
    expect(repos.retreaverCalls.upsertByUuid).not.toHaveBeenCalled();
  });

  it("skips calls with no publisher, no cid match and no number match", async () => {
    (repos.publishers.findByAfid as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (retreaver.fetchCalls as ReturnType<typeof vi.fn>).mockResolvedValue({ calls: [call({ afid: null, cid: null })], nextPage: null });

    const result = await syncRetreaverCalls();

    expect(result).toEqual({ stored: 0, skipped: 1, truncated: false });
    expect(repos.retreaverCalls.upsertByUuid).not.toHaveBeenCalled();
  });
});

describe("retreaver webhook", () => {
  const queryCall = "uuid=call-wh&afid=pub-1&cid=9872&dialed_number=%2B19999999999&status=finished&connected=1&payout=25&total_duration=60&caller=%2B15550001111";
  const publisher = {
    id: "pub-1", name: "P", email: null, afid: "pub-1", commission_pct: 0,
    fixed_price_cents: 2500, retreaver_status: "active", active: true, created_at: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (repos.publishers.findByAfid as ReturnType<typeof vi.fn>).mockResolvedValue(publisher);
    (repos.phoneNumbers.findByE164 as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (repos.campaigns.findByRetreaverCid as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (repos.campaigns.findByPublisher as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "camp-1", agency_id: "agency-1", name: "A", status: "active", routing_strategy: "round_robin",
        price_cents: 4500, min_connected_seconds: 10, buffer_seconds: 0, allowed_endpoints: [],
        target_states: [], target_zip_prefixes: [], required_license: null, required_skills: [],
        record_calls: true, consent_policy: {}, publisher_id: "pub-1", rtb_enabled: false,
        rtb_postback_key_encrypted: null, retreaver_cid: null,
      },
    ]);
    (repos.campaigns.linkRetreaverCid as ReturnType<typeof vi.fn>).mockImplementation((id, cid) =>
      Promise.resolve({
        id, retreaver_cid: cid, agency_id: "agency-1", name: "A", status: "active",
        routing_strategy: "round_robin", price_cents: 4500, min_connected_seconds: 10,
        buffer_seconds: 0, allowed_endpoints: [], target_states: [], target_zip_prefixes: [],
        required_license: null, required_skills: [], record_calls: true, consent_policy: {},
        publisher_id: "pub-1", rtb_enabled: false, rtb_postback_key_encrypted: null,
      }),
    );
  });

  it("rejects requests without the webhook token", async () => {
    await expect(handleRetreaverWebhook(new Request(`https://x/api/webhooks/retreaver?${queryCall}`))).rejects.toThrow("token");
  });

  it("stores a forwarded call attributed by cid", async () => {
    const result = await handleRetreaverWebhook(new Request(`https://x/api/webhooks/retreaver?token=test-webhook-secret&${queryCall}`));

    expect(result).toEqual({ stored: true });
    expect(repos.retreaverCalls.upsertByUuid).toHaveBeenCalledWith(
      expect.objectContaining({ uuid: "call-wh", agencyId: "agency-1", campaignId: "camp-1", publisherId: "pub-1", payoutCents: 2500 }),
    );
  });

  it("does not store when nothing can be attributed", async () => {
    (repos.publishers.findByAfid as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await handleRetreaverWebhook(new Request(`https://x/api/webhooks/retreaver?token=test-webhook-secret&${queryCall}`));

    expect(result).toEqual({ stored: false });
    expect(repos.retreaverCalls.upsertByUuid).not.toHaveBeenCalled();
  });
});

describe("rtb reservations", () => {
  const campaign = {
    id: "camp-1", agency_id: "agency-1", name: "RTB Campaign", status: "active",
    routing_strategy: "round_robin", price_cents: 1200, min_connected_seconds: 10, buffer_seconds: 0,
    allowed_endpoints: [], target_states: [], target_zip_prefixes: [], required_license: null,
    required_skills: [], record_calls: true, consent_policy: {}, publisher_id: "pub-1",
    rtb_enabled: true, rtb_postback_key_encrypted: encryptSecret("rtb-postback-key"),
    retreaver_cid: null,
  };
  const publisher = {
    id: "pub-1", name: "P", email: null, afid: "pub-1", commission_pct: 0,
    fixed_price_cents: 2500, retreaver_status: "active", active: true, created_at: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENCRYPTION_KEY = "test-encryption-key";
    (repos.campaigns.findById as ReturnType<typeof vi.fn>).mockResolvedValue(campaign);
    (repos.publishers.findById as ReturnType<typeof vi.fn>).mockResolvedValue(publisher);
    (repos.phoneNumbers.findByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "n1", agency_id: "agency-1", campaign_id: "camp-1", provider: "telnyx", e164: "+18005551234", status: "active",
    });
    (repos.rtbReservations.create as ReturnType<typeof vi.fn>).mockImplementation((data) =>
      Promise.resolve({ id: "res-1", ...data, status: "reserved", created_at: "", updated_at: "" }),
    );
    (repos.rtbReservations.findById as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve({ id: "res-1", status: "reserved", created_at: "", updated_at: "" }),
    );
    (repos.rtbReservations.setStatus as ReturnType<typeof vi.fn>).mockImplementation((_id, status) =>
      Promise.resolve({ id: "res-1", status, created_at: "", updated_at: "" }),
    );
  });

  it("reserves via Retreaver with the campaign number and publisher price", async () => {
    (retreaver.reserveRtb as ReturnType<typeof vi.fn>).mockResolvedValue({
      uuid: "rtb-uuid-1", status: "reserved", retreaver_payout: 25, retreaver_seconds: null,
      inbound_number: "+18005551234", sip_address: "sip:rtb@retreaver.com", expires_at: "2026-08-05T18:00:00Z",
    });

    const row = await reserveRtbReservation({ campaignId: "camp-1", callerNumber: "+15550001111" });

    expect(retreaver.reserveRtb).toHaveBeenCalledWith({
      key: "rtb-postback-key",
      publisherId: "pub-1",
      callerNumber: "+15550001111",
      inboundNumber: "+18005551234",
    });
    expect(repos.rtbReservations.create).toHaveBeenCalledWith(
      expect.objectContaining({ campaignId: "camp-1", publisherId: "pub-1", payoutCents: 2500, rtbUuid: "rtb-uuid-1" }),
    );
    expect(repos.rtbReservations.setStatus).toHaveBeenCalledWith("res-1", "reserved", expect.any(Object));
    expect(row).not.toBeNull();
  });

  it("records no_target reservations", async () => {
    (retreaver.reserveRtb as ReturnType<typeof vi.fn>).mockResolvedValue({
      uuid: "rtb-uuid-2", status: "no_target", retreaver_payout: null, retreaver_seconds: null,
      inbound_number: "+18005551234", sip_address: null, expires_at: null,
    });

    await reserveRtbReservation({ campaignId: "camp-1" });

    expect(repos.rtbReservations.setStatus).toHaveBeenCalledWith("res-1", "no_target", expect.any(Object));
  });

  it("rejects campaigns without rtb enabled", async () => {
    (repos.campaigns.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ ...campaign, rtb_enabled: false });
    await expect(reserveRtbReservation({ campaignId: "camp-1" })).rejects.toThrow("not enabled");
  });

  it("rejects unprovisioned publishers", async () => {
    (repos.publishers.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ ...publisher, retreaver_status: "unprovisioned" });
    await expect(reserveRtbReservation({ campaignId: "camp-1" })).rejects.toThrow("not active");
  });

  it("confirms a reserved reservation with the decrypted key", async () => {
    (repos.rtbReservations.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "res-1", campaign_id: "camp-1", publisher_id: "pub-1", rtb_uuid: "rtb-uuid-1",
      caller_number: null, status: "reserved", payout_cents: null, inbound_number: null,
      sip_address: null, expires_at: null, tags: {}, created_at: "", updated_at: "",
    });
    (retreaver.confirmRtb as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "confirmed" });

    await confirmRtbReservation("res-1");

    expect(retreaver.confirmRtb).toHaveBeenCalledWith("rtb-uuid-1", "rtb-postback-key");
    expect(repos.rtbReservations.setStatus).toHaveBeenCalledWith("res-1", "confirmed", { provider_status: "confirmed" });
  });

  it("expires stale reserved reservations", async () => {
    (repos.rtbReservations.findExpiredReserved as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "res-1", campaign_id: "camp-1", publisher_id: null, rtb_uuid: null, caller_number: null, status: "reserved", payout_cents: null, inbound_number: null, sip_address: null, expires_at: "2026-01-01T00:00:00Z", tags: {}, created_at: "", updated_at: "" },
    ]);

    const count = await expireStaleRtbReservations();

    expect(count).toBe(1);
    expect(repos.rtbReservations.setStatus).toHaveBeenCalledWith("res-1", "expired", expect.any(Object));
  });
});
