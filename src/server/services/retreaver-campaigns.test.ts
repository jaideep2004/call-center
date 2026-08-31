import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

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
      createCampaign: vi.fn(),
      updateCampaign: vi.fn(),
      listCampaigns: vi.fn(),
      getCampaign: vi.fn(),
      listNumbers: vi.fn(),
    },
  };
});

vi.mock("@/server/repositories", () => ({
  campaigns: {
    findById: vi.fn(),
    findByRetreaverCid: vi.fn(),
    linkRetreaverCid: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  phoneNumbers: { findByCampaign: vi.fn() },
  agencies: { findMany: vi.fn() },
}));

const { retreaver } = await import("@/domain/providers/retreaver");
const repos = await import("@/server/repositories");
const {
  deployCampaign,
  syncRetreaverCampaigns,
  retreaverWebhookUrl,
  getCampaignRetreaverNumbers,
  BUYER_TIMER_SECONDS,
  SALE_TIMER_SECONDS,
} = await import("./retreaver-campaigns");

const campaign = {
  id: "camp-1", agency_id: "agency-1", name: "Test Campaign", status: "active",
  routing_strategy: "round_robin", price_cents: 4500, min_connected_seconds: 10,
  buffer_seconds: 0, allowed_endpoints: [], target_states: [], target_zip_prefixes: [],
  required_license: null, required_skills: [], record_calls: true, consent_policy: {},
  publisher_id: "pub-1", rtb_enabled: false, rtb_postback_key_encrypted: null,
  retreaver_cid: null,
};

describe("retreaverWebhookUrl", () => {
  const originalBase = process.env.APP_BASE_URL;
  const originalToken = process.env.RETREAVER_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.APP_BASE_URL = "https://app.example.com/";
    process.env.RETREAVER_WEBHOOK_SECRET = "wh-secret";
  });

  afterAll(() => {
    if (originalBase === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = originalBase;
    if (originalToken === undefined) delete process.env.RETREAVER_WEBHOOK_SECRET;
    else process.env.RETREAVER_WEBHOOK_SECRET = originalToken;
  });

  it("builds the webhook URL with the secret token", () => {
    expect(retreaverWebhookUrl()).toBe("https://app.example.com/api/webhooks/retreaver?token=wh-secret");
  });

  it("throws when the webhook secret is missing", () => {
    delete process.env.RETREAVER_WEBHOOK_SECRET;
    expect(() => retreaverWebhookUrl()).toThrow("RETREAVER_WEBHOOK_SECRET");
  });
});

describe("deployCampaign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_BASE_URL = "https://app.example.com";
    process.env.RETREAVER_WEBHOOK_SECRET = "wh-secret";
    (repos.campaigns.findById as ReturnType<typeof vi.fn>).mockResolvedValue(campaign);
    (repos.phoneNumbers.findByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "n1", agency_id: "agency-1", campaign_id: "camp-1", provider: "telnyx", e164: "+18886713949", status: "active",
    });
    (repos.campaigns.linkRetreaverCid as ReturnType<typeof vi.fn>).mockResolvedValue({ ...campaign, retreaver_cid: "camp-1" });
  });

  it("creates the remote campaign with Option A timers and forwarding to our number", async () => {
    (retreaver.createCampaign as ReturnType<typeof vi.fn>).mockResolvedValue({ cid: "camp-1", name: "Test Campaign" });

    await deployCampaign("camp-1");

    expect(retreaver.createCampaign).toHaveBeenCalledWith({
      cid: "camp1",
      name: "Test Campaign",
      record_calls: true,
      timers: [
        { seconds: BUYER_TIMER_SECONDS, url: "https://app.example.com/api/webhooks/retreaver?token=wh-secret" },
        { seconds: SALE_TIMER_SECONDS, url: "https://app.example.com/api/webhooks/retreaver?token=wh-secret" },
      ],
      menuOptions: [{ option: "1", targetNumber: "+18886713949" }],
    });
    expect(repos.campaigns.linkRetreaverCid).toHaveBeenCalledWith("camp-1", "camp1");
  });

  it("updates an already-deployed campaign instead of creating", async () => {
    (repos.campaigns.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ ...campaign, retreaver_cid: "abc123" });
    (retreaver.updateCampaign as ReturnType<typeof vi.fn>).mockResolvedValue({ cid: "abc123", name: "Test Campaign" });

    await deployCampaign("camp-1");

    expect(retreaver.updateCampaign).toHaveBeenCalledWith(
      "abc123",
      expect.objectContaining({ name: "Test Campaign", menuOptions: [{ option: "1", targetNumber: "+18886713949" }] }),
    );
    expect(retreaver.createCampaign).not.toHaveBeenCalled();
    expect(repos.campaigns.linkRetreaverCid).not.toHaveBeenCalled();
  });

  it("rejects campaigns without a phone number", async () => {
    (repos.phoneNumbers.findByCampaign as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(deployCampaign("camp-1")).rejects.toThrow("no phone number");
    expect(retreaver.createCampaign).not.toHaveBeenCalled();
  });
});

describe("syncRetreaverCampaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (repos.campaigns.findByRetreaverCid as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (repos.campaigns.create as ReturnType<typeof vi.fn>).mockImplementation((data) =>
      Promise.resolve({ id: "new-1", ...data, retreaver_cid: null }),
    );
    (repos.campaigns.linkRetreaverCid as ReturnType<typeof vi.fn>).mockImplementation((id, cid) =>
      Promise.resolve({ id, retreaver_cid: cid }),
    );
    (retreaver.getCampaign as ReturnType<typeof vi.fn>).mockImplementation((cid: string) =>
      Promise.resolve({ cid, name: "Remote", record_calls: true, timers: [], menu_options: [], created_at: "", updated_at: "", paused: false }),
    );
  });

  it("creates campaigns from Retreaver with the given agency", async () => {
    (retreaver.listCampaigns as ReturnType<typeof vi.fn>).mockResolvedValue([
      { cid: "cid-1", name: "Client Campaign", record_calls: true, timers: [], menu_options: [], created_at: "", updated_at: "" },
      { cid: "cid-2", name: "Another One", record_calls: true, timers: [], menu_options: [], created_at: "", updated_at: "" },
    ]);

    const result = await syncRetreaverCampaigns({ agencyId: "agency-1" });

    expect(result).toEqual({ created: 2, updated: 0, total: 2 });
    expect(repos.campaigns.create).toHaveBeenCalledWith(expect.objectContaining({
      agency_id: "agency-1", name: "Client Campaign", routing_strategy: "round_robin", status: "active",
    }));
    expect(repos.campaigns.create).not.toHaveBeenCalledWith(expect.objectContaining({ price_cents: expect.any(Number) }));
    expect(repos.campaigns.linkRetreaverCid).toHaveBeenCalledWith("new-1", "cid-1");
  });

  it("falls back to the first agency when none is provided", async () => {
    (retreaver.listCampaigns as ReturnType<typeof vi.fn>).mockResolvedValue([
      { cid: "cid-1", name: "Client Campaign", record_calls: true, timers: [], menu_options: [], created_at: "", updated_at: "" },
    ]);
    (repos.agencies.findMany as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [{ id: "default-agency" }], pagination: { total: 1 } });

    await syncRetreaverCampaigns({ agencyId: null });

    expect(repos.campaigns.create).toHaveBeenCalledWith(expect.objectContaining({ agency_id: "default-agency" }));
  });

  it("updates the name of existing campaigns but never touches price", async () => {
    (repos.campaigns.findByRetreaverCid as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...campaign, id: "camp-1", retreaver_cid: "cid-1", price_cents: 4500, name: "Old Name",
    });
    (retreaver.listCampaigns as ReturnType<typeof vi.fn>).mockResolvedValue([
      { cid: "cid-1", name: "New Name", record_calls: true, timers: [], menu_options: [], created_at: "", updated_at: "" },
    ]);

    const result = await syncRetreaverCampaigns({ agencyId: "agency-1" });

    expect(result).toEqual({ created: 0, updated: 1, total: 1 });
    expect(repos.campaigns.update).toHaveBeenCalledWith("camp-1", { name: "New Name" });
    expect(repos.campaigns.create).not.toHaveBeenCalled();
  });

  it("auto-activates placeholder campaigns but leaves priced drafts and paused ones alone", async () => {
    (repos.campaigns.findByRetreaverCid as ReturnType<typeof vi.fn>).mockImplementation((cid: string) => {
      const byCid: Record<string, { id: string; status: string; price_cents: number | null }> = {
        "cid-1": { ...campaign, id: "c1", status: "draft", price_cents: null },
        "cid-2": { ...campaign, id: "c2", status: "draft", price_cents: 4500 },
        "cid-3": { ...campaign, id: "c3", status: "paused", price_cents: 1 },
      };
      return Promise.resolve(byCid[cid]);
    });
    (retreaver.listCampaigns as ReturnType<typeof vi.fn>).mockResolvedValue([
      { cid: "cid-1", name: "Test Campaign", record_calls: true, timers: [], menu_options: [], created_at: "", updated_at: "" },
      { cid: "cid-2", name: "Test Campaign", record_calls: true, timers: [], menu_options: [], created_at: "", updated_at: "" },
      { cid: "cid-3", name: "Test Campaign", record_calls: true, timers: [], menu_options: [], created_at: "", updated_at: "" },
    ]);
    (retreaver.getCampaign as ReturnType<typeof vi.fn>).mockImplementation((cid: string) =>
      Promise.resolve({
        cid, name: "Test Campaign", record_calls: true, timers: [], menu_options: [],
        created_at: "", updated_at: "", paused: cid === "cid-3",
      }),
    );

    const result = await syncRetreaverCampaigns({ agencyId: "agency-1" });

    expect(result).toEqual({ created: 0, updated: 1, total: 3 });
    expect(repos.campaigns.update).toHaveBeenCalledWith("c1", { status: "active" });
    expect(repos.campaigns.update).not.toHaveBeenCalledWith("c2", { status: "active" });
    expect(repos.campaigns.update).not.toHaveBeenCalledWith("c3", { status: "active" });
  });

  it("pauses local campaigns that are paused in Retreaver", async () => {
    (repos.campaigns.findByRetreaverCid as ReturnType<typeof vi.fn>).mockImplementation((cid: string) =>
      Promise.resolve(cid === "cid-1" ? ({ ...campaign, id: "c1", retreaver_cid: "cid-1" } as { status: string }) : null),
    );
    (retreaver.listCampaigns as ReturnType<typeof vi.fn>).mockResolvedValue([
      { cid: "cid-1", name: "Test Campaign", record_calls: true, timers: [], menu_options: [], created_at: "", updated_at: "" },
      { cid: "cid-9", name: "Paused New", record_calls: true, timers: [], menu_options: [], created_at: "", updated_at: "" },
    ]);
    (retreaver.getCampaign as ReturnType<typeof vi.fn>).mockResolvedValue({
      cid: "cid-1", name: "Test Campaign", record_calls: true, timers: [], menu_options: [],
      created_at: "", updated_at: "", paused: true,
    });

    const result = await syncRetreaverCampaigns({ agencyId: "agency-1" });

    expect(result).toEqual({ created: 1, updated: 1, total: 2 });
    expect(repos.campaigns.update).toHaveBeenCalledWith("c1", { status: "paused" });
    expect(repos.campaigns.create).toHaveBeenCalledWith(expect.objectContaining({ name: "Paused New", status: "paused" }));
  });

  it("unpauses synced campaigns when Retreaver unpauses them", async () => {
    (repos.campaigns.findByRetreaverCid as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...campaign, id: "c1", retreaver_cid: "cid-1", status: "paused",
    } as { status: string });
    (retreaver.listCampaigns as ReturnType<typeof vi.fn>).mockResolvedValue([
      { cid: "cid-1", name: "Test Campaign", record_calls: true, timers: [], menu_options: [], created_at: "", updated_at: "" },
    ]);

    const result = await syncRetreaverCampaigns({ agencyId: "agency-1" });

    expect(result).toEqual({ created: 0, updated: 1, total: 1 });
    expect(repos.campaigns.update).toHaveBeenCalledWith("c1", { status: "active" });
  });

  it("leaves completed campaigns untouched even when paused in Retreaver", async () => {
    (repos.campaigns.findByRetreaverCid as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...campaign, id: "c1", retreaver_cid: "cid-1", status: "completed",
    } as { status: string });
    (retreaver.listCampaigns as ReturnType<typeof vi.fn>).mockResolvedValue([
      { cid: "cid-1", name: "Test Campaign", record_calls: true, timers: [], menu_options: [], created_at: "", updated_at: "" },
    ]);
    (retreaver.getCampaign as ReturnType<typeof vi.fn>).mockResolvedValue({
      cid: "cid-1", name: "Test Campaign", record_calls: true, timers: [], menu_options: [],
      created_at: "", updated_at: "", paused: true,
    });

    const result = await syncRetreaverCampaigns({ agencyId: "agency-1" });

    expect(result).toEqual({ created: 0, updated: 0, total: 1 });
    expect(repos.campaigns.update).not.toHaveBeenCalled();
  });

  it("ignores remote campaigns without a cid or name", async () => {
    (retreaver.listCampaigns as ReturnType<typeof vi.fn>).mockResolvedValue([
      { cid: null, name: "No cid", record_calls: true, timers: [], menu_options: [], created_at: "", updated_at: "" },
      { cid: "cid-2", name: null, record_calls: true, timers: [], menu_options: [], created_at: "", updated_at: "" },
    ]);

    const result = await syncRetreaverCampaigns({ agencyId: "agency-1" });

    expect(result).toEqual({ created: 0, updated: 0, total: 2 });
    expect(repos.campaigns.create).not.toHaveBeenCalled();
  });

  it("is idempotent when the same campaigns are already linked", async () => {
    (repos.campaigns.findByRetreaverCid as ReturnType<typeof vi.fn>).mockImplementation((cid) =>
      Promise.resolve({ ...campaign, id: `x-${cid}`, retreaver_cid: cid, name: "Same" }),
    );
    (retreaver.listCampaigns as ReturnType<typeof vi.fn>).mockResolvedValue([
      { cid: "cid-1", name: "Same", record_calls: true, timers: [], menu_options: [], created_at: "", updated_at: "" },
    ]);

    const result = await syncRetreaverCampaigns({ agencyId: "agency-1" });

    expect(result).toEqual({ created: 0, updated: 0, total: 1 });
    expect(repos.campaigns.update).not.toHaveBeenCalled();
  });
});

describe("getCampaignRetreaverNumbers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (repos.campaigns.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ ...campaign, retreaver_cid: "cid-1" });
  });

  it("returns the intake numbers attached to the linked campaign", async () => {
    (retreaver.listNumbers as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, number: "+18005551234", toll_free: true, afid: "pub-1", sid: null, created_at: "", updated_at: "" },
      { id: 2, number: "+16475551234", toll_free: false, afid: "pub-1", sid: "sub1", created_at: "", updated_at: "" },
    ]);

    const numbers = await getCampaignRetreaverNumbers("camp-1");

    expect(retreaver.listNumbers).toHaveBeenCalledWith({ cid: "cid-1" });
    expect(numbers).toHaveLength(2);
    expect(numbers[0].number).toBe("+18005551234");
  });

  it("returns an empty list for campaigns not linked to Retreaver", async () => {
    (repos.campaigns.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ ...campaign, retreaver_cid: null });

    const numbers = await getCampaignRetreaverNumbers("camp-1");

    expect(numbers).toEqual([]);
    expect(retreaver.listNumbers).not.toHaveBeenCalled();
  });
});
