import { describe, it, expect, vi, beforeEach } from "vitest";

const findCallMock = vi.hoisted(() => vi.fn());
const findAgentMock = vi.hoisted(() => vi.fn(async () => ({ id: "agent-own" })));

vi.mock("@/server/repositories", () => ({
  calls: { findById: findCallMock },
  dispositions: { findByCallId: vi.fn(async () => null) },
  agents: { findByMembershipId: findAgentMock },
  leads: { createFromCall: vi.fn(async () => ({ id: "lead-1" })) },
}));

vi.mock("@/server/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => null),
  transaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => fn({})),
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
            membership: { id: "m-1", agency_id: "agency-1", role: "agent" },
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

function post(callState: string, outcome = "sold", extra: Record<string, unknown> = {}) {
  findCallMock.mockResolvedValue({ id: "call-1", agency_id: "agency-1", agent_id: "agent-own", state: callState, from_hash: "h", campaign_id: "c-1" });
  return POST(
    new Request("http://x/api/v1/calls/call-1/disposition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, ...extra }),
    }),
    { params: Promise.resolve({ id: "call-1" }) } as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  findAgentMock.mockResolvedValue({ id: "agent-own" } as never);
});

describe("POST disposition state guard", () => {
  it("422s dispositions on ringing calls (no outcome yet)", async () => {
    const res = await post("ringing", "sold");
    expect(res.status).toBe(422);
  });

  it("accepts no_answer on missed calls (legitimate attempt outcome)", async () => {
    const res = await post("missed", "no_answer");
    expect(res.status).toBe(200);
  });

  it("accepts sold on connected calls", async () => {
    const res = await post("connected", "sold", { annual_premium_cents: 50000 });
    expect(res.status).toBe(200);
  });
});
