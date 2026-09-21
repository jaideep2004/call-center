import { describe, it, expect, vi, beforeEach } from "vitest";

const findTicketMock = vi.hoisted(() => vi.fn(async (): Promise<{ id: string; agency_id: string; subject: string } | null> => ({ id: "t-1", agency_id: "agency-1", subject: "Login broken" })));
const addReplyMock = vi.hoisted(() => vi.fn(async () => ({ id: "r-1", ticket_id: "t-1" })));
const notifyMock = vi.hoisted(() => vi.fn(async (_opts: unknown) => undefined));
const membershipEmailMock = vi.hoisted(() => vi.fn(async () => "requester@example.com"));

vi.mock("@/server/repositories", () => ({
  supportTickets: { findByIdForAgency: findTicketMock, addReply: addReplyMock },
}));

vi.mock("@/server/services/notify", () => ({
  notify: notifyMock,
}));

vi.mock("@/server/services/action-emails", () => ({
  membershipEmail: membershipEmailMock,
}));

let sessionRole = "agent";

vi.mock("@/server/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/api-utils")>();
  return {
    ...actual,
    apiHandler: (handler: (req: Request, ctx: unknown) => Promise<Response>) => {
      return async (req: Request, ctx: unknown) => {
        try {
          return await handler(req, {
            ...(ctx as object),
            user: { id: "user-1", role: sessionRole },
            agencyId: "agency-1",
            membership: { id: "m-1" },
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

function post(body?: unknown) {
  return POST(
    new Request("http://x/api/v1/support/tickets/t-1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "t-1" }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionRole = "agent";
});

describe("POST support reply -> inbox notification", () => {
  it("writes a support.reply row for the agency on every reply", async () => {
    const res = await post({ body: "Have you tried turning it off and on?" });
    expect(res.status).toBe(200);
    expect(addReplyMock).toHaveBeenCalledWith("t-1", "m-1", "Have you tried turning it off and on?");
    expect(notifyMock).toHaveBeenCalledTimes(1);
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId: "agency-1",
        topic: "support.reply",
        emailTo: "requester@example.com",
        payload: expect.objectContaining({ ticket_id: "t-1", subject: "Login broken" }),
      }),
    );
  });

  it("labels admin authors as Admin", async () => {
    sessionRole = "admin";
    await post({ body: "Fixed, please retry" });
    const call = notifyMock.mock.calls[0] as unknown as [{ payload: { message: string } }];
    expect(call[0].payload.message).toMatch(/Admin replied/);
  });

  it("never notifies when the reply is rejected (unknown ticket)", async () => {
    findTicketMock.mockResolvedValueOnce(null);
    const res = await post({ body: "hello?" });
    expect(res.status).toBe(404);
    expect(addReplyMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });
});
