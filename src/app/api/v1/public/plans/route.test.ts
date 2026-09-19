import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.hoisted(() => vi.fn(async (): Promise<unknown[]> => []));
const queryOneMock = vi.hoisted(() => vi.fn(async (): Promise<unknown> => null));

vi.mock("@/server/db", () => ({
  query: queryMock,
  queryOne: queryOneMock,
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return { ...actual, publicApiHandler: (h: unknown) => h };
});

const { GET } = await import("./route");

type GetFn = (req: Request) => Promise<Response>;
const getFn = GET as unknown as GetFn;

function get() {
  return getFn(new Request("http://x/api/v1/public/plans"));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/public/plans", () => {
  it("returns active plans cheapest-first with string feature lists", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "agency-1" });
    queryMock.mockResolvedValueOnce([
      { id: "p1", name: "Starter", price_cents: 0, call_allowance: 100, billing_type: "prepaid", features: { list: ["A", "B"] } },
      { id: "p2", name: "Pro", price_cents: 5000, call_allowance: 0, billing_type: "postpaid", features: null },
    ]);
    const res = await getFn(new Request("http://x/api/v1/public/plans"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([
      { id: "p1", name: "Starter", price_cents: 0, call_allowance: 100, billing_type: "prepaid", features: ["A", "B"] },
      { id: "p2", name: "Pro", price_cents: 5000, call_allowance: 0, billing_type: "postpaid", features: [] },
    ]);
    const [, params] = queryMock.mock.calls[0] as unknown as [string, unknown[]];
    expect(params).toEqual(["agency-1"]);
  });

  it("returns [] with no agency (homepage falls back to built-ins)", async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const res = await getFn(new Request("http://x/api/v1/public/plans"));
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("exposes no internal fields", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "agency-1" });
    queryMock.mockResolvedValueOnce([
      { id: "p1", name: "X", price_cents: 100, call_allowance: 10, billing_type: "prepaid", features: {} },
    ]);
    const res = await getFn(new Request("http://x/api/v1/public/plans"));
    const body = await res.json();
    expect(Object.keys(body.data[0]).sort()).toEqual(
      ["billing_type", "call_allowance", "features", "id", "name", "price_cents"],
    );
  });
});
