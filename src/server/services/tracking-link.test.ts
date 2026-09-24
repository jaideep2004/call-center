import { describe, it, expect, vi, beforeEach } from "vitest";

const findByAfidMock = vi.hoisted(() => vi.fn());
const campaignFindMock = vi.hoisted(() => vi.fn());
const numberFindMock = vi.hoisted(() => vi.fn());
const queryOneMock = vi.hoisted(() => vi.fn());
const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/db", () => ({
  query: queryMock,
  queryOne: queryOneMock,
  transaction: vi.fn(),
}));

vi.mock("@/server/repositories", () => ({
  publishers: { findByAfid: findByAfidMock, findByUserId: vi.fn(), findById: vi.fn() },
  campaigns: { findById: campaignFindMock },
  phoneNumbers: { findByCampaign: numberFindMock },
  publisherInvites: {},
  memberships: {},
}));

const { getTrackingLinkData, recordTrackingClick, getClickStats } = await import("./publisher-portal");

const publisher = { id: "pub-1", name: "TV Traffic" };
const campaign = { id: "camp-1", name: "Medicare Short", status: "active", deleted_at: null };

beforeEach(() => {
  vi.clearAllMocks();
  findByAfidMock.mockResolvedValue({ ...publisher });
  campaignFindMock.mockResolvedValue({ ...campaign });
  queryOneMock.mockResolvedValue({ one: 1 });
  numberFindMock.mockResolvedValue({ e164: "+15551234567", status: "active" });
});

describe("getTrackingLinkData", () => {
  it("resolves publisher + campaign + tracking number", async () => {
    const data = await getTrackingLinkData("AFF1", "camp-1");
    expect(data).toMatchObject({
      publisherId: "pub-1",
      campaignName: "Medicare Short",
      trackingNumber: "+15551234567",
    });
  });

  it("404s unknown afids", async () => {
    findByAfidMock.mockResolvedValue(null);
    await expect(getTrackingLinkData("NOPE", "camp-1")).resolves.toBeNull();
  });

  it("404s inactive or deleted campaigns", async () => {
    campaignFindMock.mockResolvedValue({ ...campaign, status: "paused" });
    await expect(getTrackingLinkData("AFF1", "camp-1")).resolves.toBeNull();
  });

  it("404s unassigned campaigns (never advertise what isn't yours)", async () => {
    queryOneMock.mockResolvedValue(null);
    await expect(getTrackingLinkData("AFF1", "camp-1")).resolves.toBeNull();
  });

  it("404s campaigns with no tracking number", async () => {
    numberFindMock.mockResolvedValue(null);
    await expect(getTrackingLinkData("AFF1", "camp-1")).resolves.toBeNull();
  });
});

describe("recordTrackingClick / getClickStats", () => {
  it("logs clicks without throwing", async () => {
    await expect(recordTrackingClick({ publisherId: "pub-1", campaignId: "camp-1", referrer: "x.com" })).resolves.toBeUndefined();
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("tracking_clicks"), ["pub-1", "camp-1", "x.com"]);
  });

  it("click insert failure never breaks the page", async () => {
    queryMock.mockRejectedValueOnce(new Error("db down"));
    await expect(recordTrackingClick({ publisherId: "pub-1", campaignId: "camp-1" })).resolves.toBeUndefined();
  });

  it("returns per-campaign click counts", async () => {
    queryMock.mockResolvedValue([{ campaign_id: "camp-1", clicks: 7 }]);
    await expect(getClickStats("pub-1")).resolves.toEqual([{ campaign_id: "camp-1", clicks: 7 }]);
  });

  it("returns [] when stats are unavailable", async () => {
    queryMock.mockRejectedValueOnce(new Error("db down"));
    await expect(getClickStats("pub-1")).resolves.toEqual([]);
  });
});
