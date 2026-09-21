import { describe, it, expect, vi, beforeEach } from "vitest";

const findAllByCampaignMock = vi.hoisted(() => vi.fn(async () => [{ id: "n1", e164: "+15550001111" }]));
const findAllMock = vi.hoisted(() => vi.fn(async () => [{ id: "n1" }, { id: "n2" }]));
const findByAgencyMock = vi.hoisted(() => vi.fn(async () => [{ id: "n9" }]));
const campaignFindMock = vi.hoisted(() => vi.fn(async () => ({ id: "camp-1" })));
const createMock = vi.hoisted(() => vi.fn(async (d: unknown) => ({ id: "n-new", ...(d as object) })));

vi.mock("@/server/repositories", () => ({
  phoneNumbers: {
    findAllByCampaign: findAllByCampaignMock,
    findAll: findAllMock,
    findByAgency: findByAgencyMock,
    create: createMock,
  },
  campaigns: { findById: campaignFindMock },
}));

let routeCtx: { user: { id: string; role: string }; agencyId: string | null };

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return (req: Request, ctx: unknown) => handler(req, { ...(ctx as object), ...routeCtx });
    },
  };
});

const { GET, POST } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
  routeCtx = { user: { id: "u-admin", role: "admin" }, agencyId: "agency-1" };
});

describe("GET /api/v1/phone-numbers", () => {
  it("admin with campaign_id sees that campaign's numbers unscoped", async () => {
    const res = await GET(new Request("http://x/api/v1/phone-numbers?campaign_id=camp-1"), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(200);
    expect(findAllByCampaignMock).toHaveBeenCalledWith("camp-1", undefined);
  });

  it("admin without filter sees every agency's numbers", async () => {
    const res = await GET(new Request("http://x/api/v1/phone-numbers"), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    expect(findAllMock).toHaveBeenCalled();
    expect(findByAgencyMock).not.toHaveBeenCalled();
  });

  it("heads stay scoped to their own agency", async () => {
    routeCtx = { user: { id: "u-head", role: "agent" }, agencyId: "agency-9" };
    const res = await GET(new Request("http://x/api/v1/phone-numbers"), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    expect(findByAgencyMock).toHaveBeenCalledWith("agency-9");
  });
});

describe("POST /api/v1/phone-numbers", () => {
  it("admin can target the campaign's agency explicitly", async () => {
    const res = await POST(
      new Request("http://x/api/v1/phone-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: "+15550002222", campaign_id: "camp-1", provider: "telnyx", agency_id: "agency-2" }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(201);
    expect(campaignFindMock).toHaveBeenCalledWith("camp-1", "agency-2");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ agency_id: "agency-2", campaign_id: "camp-1" }),
    );
  });

  it("non-admin agency_id is ignored in favor of their own agency", async () => {
    routeCtx = { user: { id: "u-head", role: "agent" }, agencyId: "agency-9" };
    const res = await POST(
      new Request("http://x/api/v1/phone-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: "+15550003333", campaign_id: "camp-1", agency_id: "agency-2" }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ agency_id: "agency-9" }));
  });
});
