import { describe, it, expect, vi, beforeEach } from "vitest";

const findByIdMock = vi.hoisted(() => vi.fn());
const eventsMock = vi.hoisted(() => vi.fn(async () => []));
const campaignMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/repositories", () => ({
  calls: { findById: findByIdMock },
  callEvents: { findByCallId: eventsMock },
  agents: { findByMembershipId: vi.fn() },
  campaigns: { findById: campaignMock },
}));

vi.mock("@/server/crypto", () => ({
  decryptSecret: vi.fn((s: string) => s.replace(/^enc:/, "")),
}));

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return (req: Request, ctx: unknown) =>
        handler(req, {
          ...(ctx as object),
          user: { id: "u-admin", role: "admin" },
          agencyId: null,
          membership: null,
          isHead: false,
        }).catch((e: unknown) => {
          const err = e as { message?: string; status?: number };
          return actual.fail(err.message ?? "Internal server error", err.status ?? 500);
        });
    },
  };
});

const { GET } = await import("./route");

function get(id: string) {
  return GET(
    new Request(`http://x/api/v1/calls/${id}`, { method: "GET" }),
    { params: Promise.resolve({ id }) } as never,
  );
}

const call = {
  id: "call-1",
  agency_id: "agency-1",
  campaign_id: "camp-1",
  agent_id: "agent-1",
  state: "ended",
  from_hash: "abc123",
  connected_at: "2026-09-26T10:00:00.000Z",
  ended_at: "2026-09-26T10:02:00.000Z",
  caller_number_encrypted: "enc:+15551234567",
};

beforeEach(() => {
  vi.clearAllMocks();
  findByIdMock.mockResolvedValue(call);
  campaignMock.mockResolvedValue({ id: "camp-1", buffer_seconds: 30 });
});

describe("GET /api/v1/calls/[id] caller reveal", () => {
  it("reveals the number past the buffer and strips the ciphertext", async () => {
    const res = await get("call-1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.caller_revealed).toBe(true);
    expect(body.data.caller_number).toBe("+15551234567");
    expect(body.data.caller_number_encrypted).toBeUndefined();
  });

  it("stays masked before the buffer", async () => {
    findByIdMock.mockResolvedValue({ ...call, ended_at: "2026-09-26T10:00:10.000Z" });
    const res = await get("call-1");
    const body = await res.json();
    expect(body.data.caller_revealed).toBe(false);
    expect(body.data.caller_number).toBeNull();
  });

  it("stays masked for legacy rows without escrow", async () => {
    findByIdMock.mockResolvedValue({ ...call, caller_number_encrypted: null });
    const res = await get("call-1");
    const body = await res.json();
    expect(body.data.caller_revealed).toBe(false);
    expect(body.data.caller_number).toBeNull();
  });
});
