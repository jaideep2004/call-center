import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any[]>>();
const findLatestMock = vi.fn<(campaignId: string) => Promise<{ price_cents: number | null } | null>>();
const findRoutableMock = vi.fn<(input: Record<string, unknown>) => Promise<string | null>>();
const getCampaignMock = vi.fn<(cid: string) => Promise<{ paused?: boolean }>>();
const setPausedMock = vi.fn<(cid: string, paused: boolean) => Promise<unknown>>();
const configuredMock = vi.fn(() => true);

vi.mock("@/server/db", () => ({
  query: (sql: string, params?: unknown[]) => queryMock(sql, params),
  queryOne: vi.fn(async () => null),
}));

vi.mock("@/server/repositories", () => ({
  bidOverrides: { findLatest: findLatestMock },
}));

vi.mock("@/server/services/ping-evaluator", () => ({
  findRoutableAgentId: (input: Record<string, unknown>) => findRoutableMock(input),
}));

vi.mock("@/domain/providers/retreaver", () => ({
  retreaver: {
    configured: () => configuredMock(),
    getCampaign: (cid: string) => getCampaignMock(cid),
    setCampaignPaused: (cid: string, paused: boolean) => setPausedMock(cid, paused),
  },
}));

const { syncOfferWalletPauses } = await import("./offer-wallet-sync");

function offerRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "camp-1",
    agency_id: "agency-1",
    name: "Buyer A",
    price_cents: 3500,
    retreaver_cid: "rtv-1",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  configuredMock.mockReturnValue(true);
  queryMock.mockResolvedValue([]);
  findLatestMock.mockResolvedValue(null);
  findRoutableMock.mockResolvedValue("agent-1");
  getCampaignMock.mockResolvedValue({ paused: false });
  setPausedMock.mockResolvedValue({});
});

describe("syncOfferWalletPauses (P1.4)", () => {
  it("pauses a depleted offer (no funded agent at any state)", async () => {
    queryMock.mockResolvedValueOnce([offerRow()]);
    findRoutableMock.mockResolvedValueOnce(null);
    const result = await syncOfferWalletPauses();
    expect(findRoutableMock).toHaveBeenCalledWith({
      agencyId: "agency-1",
      campaignId: "camp-1",
      state: null,
      priceCents: 3500,
      ignoreBusy: true,
    });
    expect(setPausedMock).toHaveBeenCalledWith("rtv-1", true);
    expect(result.paused).toEqual(["camp-1"]);
  });

  it("unpauses a refunded offer", async () => {
    queryMock.mockResolvedValueOnce([offerRow()]);
    getCampaignMock.mockResolvedValueOnce({ paused: true });
    const result = await syncOfferWalletPauses();
    expect(setPausedMock).toHaveBeenCalledWith("rtv-1", false);
    expect(result.unpaused).toEqual(["camp-1"]);
  });

  it("skips the provider call when state already matches", async () => {
    queryMock.mockResolvedValueOnce([offerRow()]);
    const result = await syncOfferWalletPauses();
    expect(setPausedMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ checked: 1, paused: [], unpaused: [], skipped: [] });
  });

  it("uses the override bid for the funding check", async () => {
    queryMock.mockResolvedValueOnce([offerRow({ price_cents: 1000 })]);
    findLatestMock.mockResolvedValueOnce({ price_cents: 5000 });
    findRoutableMock.mockResolvedValueOnce(null);
    await syncOfferWalletPauses();
    expect(findRoutableMock).toHaveBeenCalledWith(expect.objectContaining({ priceCents: 5000 }));
  });

  it("skips offers with no Retreaver mapping", async () => {
    queryMock.mockResolvedValueOnce([offerRow({ retreaver_cid: null })]);
    const result = await syncOfferWalletPauses();
    expect(getCampaignMock).not.toHaveBeenCalled();
    expect(result.skipped).toEqual(["camp-1"]);
  });

  it("skips offers whose Retreaver state can't be read", async () => {
    queryMock.mockResolvedValueOnce([offerRow()]);
    getCampaignMock.mockRejectedValueOnce(new Error("timeout"));
    const result = await syncOfferWalletPauses();
    expect(setPausedMock).not.toHaveBeenCalled();
    expect(result.skipped).toEqual(["camp-1"]);
  });

  it("evaluates locally without provider calls when Retreaver is unconfigured", async () => {
    configuredMock.mockReturnValue(false);
    queryMock.mockResolvedValueOnce([offerRow()]);
    findRoutableMock.mockResolvedValueOnce(null);
    const result = await syncOfferWalletPauses();
    expect(getCampaignMock).not.toHaveBeenCalled();
    expect(setPausedMock).not.toHaveBeenCalled();
    expect(result.paused).toEqual(["camp-1"]);
  });

  it("scopes the sweep to one agency when asked", async () => {
    queryMock.mockResolvedValueOnce([]);
    await syncOfferWalletPauses("agency-9");
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("c.agency_id = $1");
    expect(params).toEqual(["agency-9"]);
  });
});
