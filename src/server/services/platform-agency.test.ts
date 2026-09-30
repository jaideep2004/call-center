import { describe, it, expect, vi, beforeEach } from "vitest";

const findAgentMock = vi.hoisted(() => vi.fn());
const adoptMock = vi.hoisted(() => vi.fn());
const findMemMock = vi.hoisted(() => vi.fn());
const createMemMock = vi.hoisted(() => vi.fn());
const settingsMock = vi.hoisted(() => vi.fn());
const queryOneMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/repositories", () => ({
  agents: { findById: findAgentMock, adoptOrCreate: adoptMock },
  memberships: { findById: findMemMock, create: createMemMock },
  systemSettings: { get: settingsMock },
}));

vi.mock("@/server/db", () => ({
  query: vi.fn(async () => []),
  queryOne: queryOneMock,
}));

const { ensurePlatformMembership } = await import("./platform-agency");

beforeEach(() => {
  vi.clearAllMocks();
  settingsMock.mockResolvedValue("agency-plat");
  queryOneMock.mockResolvedValue(null);
});

describe("ensurePlatformMembership (Option A)", () => {
  it("joins a membership-less approved agent to the platform agency", async () => {
    findAgentMock.mockResolvedValue({ id: "agent-9", membership_id: null, user_id: "u-9" });
    findMemMock.mockResolvedValue(null);
    createMemMock.mockResolvedValue({ id: "m-plat", agency_id: "agency-plat" });
    adoptMock.mockResolvedValue({ agent: { id: "agent-9" }, adopted: true });

    const out = await ensurePlatformMembership("agent-9");

    expect(out).toMatchObject({ joined: true, membershipId: "m-plat", reason: "joined_platform" });
    expect(createMemMock).toHaveBeenCalledWith(
      expect.objectContaining({ agency_id: "agency-plat", user_id: "u-9", role: "agent" }),
    );
  });

  it("leaves already-placed agents alone", async () => {
    findAgentMock.mockResolvedValue({ id: "agent-1", membership_id: "m-1", user_id: "u-1" });
    findMemMock.mockResolvedValue({ id: "m-1", status: "active" });

    const out = await ensurePlatformMembership("agent-1");

    expect(out).toMatchObject({ joined: false, reason: "already_placed" });
    expect(createMemMock).not.toHaveBeenCalled();
  });

  it("does nothing when no platform agency is configured", async () => {
    findAgentMock.mockResolvedValue({ id: "agent-9", membership_id: null, user_id: "u-9" });
    settingsMock.mockResolvedValue(null);

    const out = await ensurePlatformMembership("agent-9");

    expect(out).toMatchObject({ joined: false, reason: "no_platform_agency" });
    expect(createMemMock).not.toHaveBeenCalled();
  });

  it("never throws — approval must not fail over placement", async () => {
    findAgentMock.mockRejectedValue(new Error("db down"));

    const out = await ensurePlatformMembership("agent-9");

    expect(out.joined).toBe(false);
    expect(out.reason).toBe("agent_not_found");
  });
});
