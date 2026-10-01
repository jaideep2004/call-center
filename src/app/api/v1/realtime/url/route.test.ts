import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return { ...actual, publicApiHandler: (h: unknown) => h };
});

const { GET, gatewayPort } = await import("./route");

type GetFn = (req: Request) => Promise<Response>;
const getFn = GET as unknown as GetFn;

const origGateway = process.env.GATEWAY_URL;
const origPort = process.env.REALTIME_PORT;

function get(url: string, headers: Record<string, string> = {}) {
  return getFn(new Request(url, { headers }));
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.GATEWAY_URL;
  delete process.env.REALTIME_PORT;
});

afterEach(() => {
  if (origGateway === undefined) delete process.env.GATEWAY_URL;
  else process.env.GATEWAY_URL = origGateway;
  if (origPort === undefined) delete process.env.REALTIME_PORT;
  else process.env.REALTIME_PORT = origPort;
});

describe("GET /api/v1/realtime/url", () => {
  it("points the browser at the page host + REALTIME_PORT (the :3002 case)", async () => {
    process.env.REALTIME_PORT = "3002";
    const res = await get("https://coveragecalls.com/api/v1/realtime/url", { host: "coveragecalls.com" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ url: "https://coveragecalls.com:3002" });
  });

  it("prefers the GATEWAY_URL port when set", async () => {
    process.env.GATEWAY_URL = "http://localhost:3002";
    process.env.REALTIME_PORT = "3001";
    const res = await get("https://coveragecalls.com/api/v1/realtime/url", { host: "coveragecalls.com" });
    const body = await res.json();
    expect(body.data).toEqual({ url: "https://coveragecalls.com:3002" });
    expect(gatewayPort()).toBe(3002);
  });

  it("honors x-forwarded-host/proto behind a proxy", async () => {
    const res = await get("http://127.0.0.1:30001/api/v1/realtime/url", {
      "x-forwarded-host": "coveragecalls.com",
      "x-forwarded-proto": "https",
    });
    const body = await res.json();
    expect(body.data).toEqual({ url: "https://coveragecalls.com:3001" });
  });

  it("falls back to port 3001 on garbage env", async () => {
    process.env.REALTIME_PORT = "nope";
    expect(gatewayPort()).toBe(3001);
  });
});
