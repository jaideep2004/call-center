import { describe, it, expect, vi, beforeEach } from "vitest";

const findLeadMock = vi.hoisted(() => vi.fn(async (): Promise<{ id: string; assigned_agent_id: string | null }> => ({ id: "lead-1", assigned_agent_id: null })));
const updateLeadMock = vi.hoisted(() => vi.fn(async (_id: string, body: unknown) => ({ id: "lead-1", ...(body as object) })));
const findAgentUserMock = vi.hoisted(() => vi.fn(async () => ({ id: "agent-9", user_email: "agent9@example.com" })));
const notifyMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@/server/repositories", () => ({
  leads: { findById: findLeadMock, update: updateLeadMock },
  agents: { findByIdWithUser: findAgentUserMock },
}));

vi.mock("@/server/services/notify", () => ({
  notify: notifyMock,
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
            user: { id: "user-1", role: "admin" },
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

const { PATCH } = await import("./route");

function patch(body?: unknown) {
  return PATCH(
    new Request("http://x/api/v1/leads/lead-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "lead-1" }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH lead assignment -> inbox notification", () => {
  it("notifies lead.assigned exactly on assignee change", async () => {
    const res = await patch({ assigned_agent_id: "agent-9" });
    expect(res.status).toBe(200);
    expect(findLeadMock).toHaveBeenCalledWith("lead-1", "agency-1");
    expect(notifyMock).toHaveBeenCalledTimes(1);
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agencyId: "agency-1",
        topic: "lead.assigned",
        emailTo: "agent9@example.com",
        payload: expect.objectContaining({ lead_id: "lead-1", assigned_agent_id: "agent-9" }),
      }),
    );
  });

  it("stays silent on non-assignment edits (no read, no notify)", async () => {
    const res = await patch({ status: "contacted" });
    expect(res.status).toBe(200);
    expect(findLeadMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("stays silent when the assignee is unchanged", async () => {
    findLeadMock.mockResolvedValueOnce({ id: "lead-1", assigned_agent_id: "agent-9" });
    const res = await patch({ assigned_agent_id: "agent-9" });
    expect(res.status).toBe(200);
    expect(updateLeadMock).toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });
});
