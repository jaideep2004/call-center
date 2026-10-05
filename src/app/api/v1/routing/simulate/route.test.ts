import { describe, it, expect, vi, beforeEach } from "vitest";

const findByCampaignMock = vi.hoisted(() => vi.fn(async (): Promise<{ e164: string } | null> => ({ e164: "+18880001111" })));
const findFirstRoutableMock = vi.hoisted(() => vi.fn(async (): Promise<{ e164: string } | null> => ({ e164: "+18880002222" })));
const processMock = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => ({ call: { id: "call-sim" } })));

vi.mock("@/server/repositories", () => ({
  phoneNumbers: { findByCampaign: findByCampaignMock, findFirstRoutable: findFirstRoutableMock },
}));

vi.mock("@/server/services/call-orchestrator", () => ({
  processProviderEvent: processMock,
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, {
            ...(ctx as object),
            user: { id: "u-1", role: "agent" },
            agencyId: "agency-1",
            membership: { id: "m-1" },
            isHead: false,
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
    new Request("http://x/api/v1/routing/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /routing/simulate", () => {
  it("dials the requested campaign's real tracking number (never a fake DID)", async () => {
    const res = await post({ campaign_id: "camp-1", from: "+15551234567" });
    expect(res.status).toBe(201);
    expect(findByCampaignMock).toHaveBeenCalledWith("camp-1");
    const [event] = processMock.mock.calls[0] as unknown as [{ to: string }];
    expect(event.to).toBe("+18880001111");
  });

  it("falls back to any live number when no campaign is given", async () => {
    const res = await post({ from: "+15551234567" });
    expect(res.status).toBe(201);
    const [event] = processMock.mock.calls[0] as unknown as [{ to: string }];
    expect(event.to).toBe("+18880002222");
  });

  it("422s with guidance when the campaign has no number", async () => {
    findByCampaignMock.mockResolvedValueOnce(null);
    const res = await post({ campaign_id: "camp-9" });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.message).toMatch(/tracking number/);
    expect(processMock).not.toHaveBeenCalled();
  });

  it("422s with guidance when nothing is provisioned anywhere", async () => {
    findFirstRoutableMock.mockResolvedValueOnce(null);
    const res = await post({});
    expect(res.status).toBe(422);
    expect(processMock).not.toHaveBeenCalled();
  });
});
