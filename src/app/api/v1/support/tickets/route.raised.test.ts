import { describe, it, expect, vi, beforeEach } from "vitest";

const createTicketMock = vi.hoisted(() => vi.fn(async () => ({ id: "t-9", agency_id: "agency-1" })));
const sendRaisedMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@/server/repositories", () => ({
  supportTickets: { create: createTicketMock },
}));

vi.mock("@/server/services/action-emails", () => ({
  sendSupportTicketRaised: sendRaisedMock,
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /support/tickets raised mail", () => {
  it("creates the ticket and fires requester+head mail (best-effort)", async () => {
    const res = await POST(
      new Request("http://x/api/v1/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "Mic broken", priority: "high" }),
      }),
      { params: Promise.resolve({}) } as never,
    );
    expect(res.status).toBe(201);
    expect(createTicketMock).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "Mic broken", priority: "high" }),
    );
    expect(sendRaisedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId: "agency-1",
        ticketId: "t-9",
        subject: "Mic broken",
        priority: "high",
        requesterMembershipId: "m-1",
      }),
    );
  });
});
