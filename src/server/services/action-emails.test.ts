import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

vi.mock("@/server/services/notify", () => ({
  notify: vi.fn(),
}));

import { queryOne } from "@/server/db";
import { notify } from "@/server/services/notify";
import { sendAgentApproved, sendAgentWelcome, sendMemberAdded, membershipEmail } from "./action-emails";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("action-emails", () => {
  it("agent approved notifies inbox + agent email", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce({ user_id: "u-1", name: "Arjun" }) // agent row
      .mockResolvedValueOnce({ name: "Acme" }) // agency
      .mockResolvedValueOnce({ email: "arjun@example.com" }); // user email
    await sendAgentApproved({ agencyId: "agency-1", agentId: "agent-1" });
    expect(notify).toHaveBeenCalledOnce();
    const opts = vi.mocked(notify).mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(opts).toMatchObject({
      userId: "u-1",
      topic: "agent.approved",
      emailTo: "arjun@example.com",
    });
    expect(opts.emailSubject as string).toContain("approved");
  });

  it("agent welcome resolves the login email for inbox + mail", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce({ user_id: "u-2" }) // membership
      .mockResolvedValueOnce({ name: "Acme" }) // agency
      .mockResolvedValueOnce({ name: "Mei" }) // agent name
      .mockResolvedValueOnce({ email: "mei@example.com" }); // user email
    await sendAgentWelcome({ agencyId: "agency-1", membershipId: "m-1", agentId: "agent-2" });
    expect(notify).toHaveBeenCalledOnce();
    const opts = vi.mocked(notify).mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(opts).toMatchObject({ topic: "agent.welcome", emailTo: "mei@example.com" });
  });

  it("member added never throws when the user row is missing", async () => {
    vi.mocked(queryOne)
      .mockResolvedValueOnce({ name: "Acme" })
      .mockResolvedValueOnce(null);
    await expect(sendMemberAdded({ agencyId: "agency-1", userId: "ghost" })).resolves.toBeUndefined();
    const opts = vi.mocked(notify).mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(opts.emailTo).toBeNull();
  });

  it("membershipEmail returns null on missing rows without throwing", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    await expect(membershipEmail("nope")).resolves.toBeNull();
  });
});
