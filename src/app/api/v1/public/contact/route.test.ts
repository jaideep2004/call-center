import { describe, it, expect, vi, beforeEach } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());
const limiterMock = vi.hoisted(() => vi.fn(async (): Promise<boolean> => true));

vi.mock("@/server/db", () => ({
  query: queryMock,
  queryOne: vi.fn(),
}));

vi.mock("@/server/rate-limit", () => ({
  createRateLimiter: () => limiterMock,
  clientIp: () => "127.0.0.1",
}));

const { POST } = await import("./route");

function post(body: unknown) {
  return POST(
    new Request("http://x/api/v1/public/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) },
  );
}

const valid = {
  name: "Eleanor Vance",
  email: "e.vance@agency.com",
  phone: "+15550192834",
  agency: "Pinnacle Direct Benefits",
  callVolume: "1,000 - 5,000",
  inquiryType: "Agency Inbound Calls",
  message: "Medicare vertical, 12 agents, HubSpot integration goals.",
};

beforeEach(() => {
  vi.clearAllMocks();
  limiterMock.mockResolvedValue(true);
});

describe("POST /api/v1/public/contact", () => {
  it("inserts into app.contact_messages and returns 201 with the row id", async () => {
    queryMock.mockResolvedValueOnce([{ id: "msg-1" }]);
    const res = await post(valid);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toMatchObject({ success: true, data: { id: "msg-1" } });
    expect(queryMock).toHaveBeenCalledOnce();
    const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("INSERT INTO app.contact_messages");
    expect(params).toEqual([
      "Eleanor Vance",
      "e.vance@agency.com",
      "+15550192834",
      "Pinnacle Direct Benefits",
      "1,000 - 5,000",
      "Agency Inbound Calls",
      "Medicare vertical, 12 agents, HubSpot integration goals.",
    ]);
  });

  it("rejects invalid email with 422 and never touches the DB", async () => {
    const res = await post({ ...valid, email: "not-an-email" });
    expect(res.status).toBe(422);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects empty message with 422 and never touches the DB", async () => {
    const res = await post({ ...valid, message: "" });
    expect(res.status).toBe(422);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("returns 429 without inserting when the rate limiter denies", async () => {
    limiterMock.mockResolvedValueOnce(false);
    const res = await post(valid);
    expect(res.status).toBe(429);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
