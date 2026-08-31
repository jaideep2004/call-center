import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

vi.mock("@/server/repositories", () => ({
  publishers: {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    linkUser: vi.fn(),
  },
  publisherInvites: {
    findByToken: vi.fn(),
    findPendingByPublisher: vi.fn(),
    create: vi.fn(),
    accept: vi.fn(),
  },
}));

const db = await import("@/server/db");
const repos = await import("@/server/repositories");
const {
  getPublisherForUser,
  getPortalOverview,
  getPortalCalls,
  createPortalInvite,
  acceptPortalInvite,
} = await import("./publisher-portal");
const { hasPermission } = await import("./permission-data");

const publisher = {
  id: "pub-1",
  name: "Acme Media",
  email: "publisher@acme.test",
  afid: "0001",
  commission_pct: 0,
  fixed_price_cents: 3500,
  retreaver_status: "active",
  active: true,
  user_id: null,
  created_at: "2026-08-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("permission matrix", () => {
  it("grants publisher role access to the portal", () => {
    expect(hasPermission("publisher", "publisher-portal", "view")).toBe(true);
    expect(hasPermission("publisher", "publisher-portal", "manage")).toBe(false);
    expect(hasPermission("publisher", "publishers", "view")).toBe(true);
  });

  it("does not grant portal access to other roles", () => {
    expect(hasPermission("agent", "publisher-portal", "view")).toBe(false);
    expect(hasPermission("admin", "publisher-portal", "view")).toBe(false);
  });
});

describe("getPublisherForUser", () => {
  it("returns the publisher linked to a user", async () => {
    (repos.publishers.findByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(publisher);
    expect(await getPublisherForUser("user-1")).toBe(publisher);
    expect(repos.publishers.findByUserId).toHaveBeenCalledWith("user-1");
  });

  it("returns null when the user is not linked", async () => {
    (repos.publishers.findByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await getPublisherForUser("user-1")).toBeNull();
  });
});

describe("getPortalOverview", () => {
  it("aggregates stats and per-campaign breakdowns", async () => {
    (repos.publishers.findById as ReturnType<typeof vi.fn>).mockResolvedValue(publisher);
    (db.queryOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      total_calls: "10",
      qualified_calls: "7",
      payout_cents: "24500",
    });
    (db.query as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        campaign_id: "camp-1",
        campaign_name: "Final Expense TV",
        price_cents: "4500",
        calls: "10",
        qualified_calls: "7",
        payout_cents: "24500",
      },
    ]);

    const overview = await getPortalOverview("pub-1");
    expect(overview.stats).toEqual({ total_calls: 10, qualified_calls: 7, payout_cents: 24500 });
    expect(overview.campaigns[0]).toEqual({
      campaign_id: "camp-1",
      campaign_name: "Final Expense TV",
      price_cents: 4500,
      calls: 10,
      qualified_calls: 7,
      payout_cents: 24500,
    });
    expect(overview.publisher.fixed_price_cents).toBe(3500);
  });

  it("handles an empty account", async () => {
    (repos.publishers.findById as ReturnType<typeof vi.fn>).mockResolvedValue(publisher);
    (db.queryOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      total_calls: "0",
      qualified_calls: "0",
      payout_cents: "0",
    });
    (db.query as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const overview = await getPortalOverview("pub-1");
    expect(overview.stats).toEqual({ total_calls: 0, qualified_calls: 0, payout_cents: 0 });
    expect(overview.campaigns).toEqual([]);
  });
});

describe("getPortalCalls", () => {
  it("returns rows and total count", async () => {
    (db.queryOne as ReturnType<typeof vi.fn>).mockResolvedValue({ total: "3" });
    (db.query as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "call-1", campaign_name: "TV" }]);
    const result = await getPortalCalls("pub-1", 25, 0);
    expect(result.total).toBe(3);
    expect(result.rows).toHaveLength(1);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("WHERE r.publisher_id = $1"), ["pub-1", 25, 0]);
  });
});

describe("createPortalInvite", () => {
  it("rejects when the publisher has no email", async () => {
    (repos.publishers.findById as ReturnType<typeof vi.fn>).mockResolvedValue({ ...publisher, email: null });
    await expect(createPortalInvite("pub-1", "https://app.example.com")).rejects.toThrow("no email");
  });

  it("reuses a pending invite", async () => {
    (repos.publishers.findById as ReturnType<typeof vi.fn>).mockResolvedValue(publisher);
    (repos.publisherInvites.findPendingByPublisher as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: "existing-token", status: "pending",
    });
    const result = await createPortalInvite("pub-1", "https://app.example.com");
    expect(result.link).toBe("https://app.example.com/register?invite=existing-token");
    expect(repos.publisherInvites.create).not.toHaveBeenCalled();
  });

  it("creates a fresh invite when none is pending", async () => {
    (repos.publishers.findById as ReturnType<typeof vi.fn>).mockResolvedValue(publisher);
    (repos.publisherInvites.findPendingByPublisher as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (repos.publisherInvites.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "inv-1" });
    const result = await createPortalInvite("pub-1", "https://app.example.com");
    expect(repos.publisherInvites.create).toHaveBeenCalledWith({
      publisher_id: "pub-1",
      email: "publisher@acme.test",
      token: expect.any(String),
    });
    expect(result.link).toContain("https://app.example.com/register?invite=");
    expect(result.link).not.toContain("https://app.example.com/register?invite=undefined");
  });
});

describe("acceptPortalInvite", () => {
  it("activates the portal for a fresh user", async () => {
    (repos.publisherInvites.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      publisher_id: "pub-1", status: "pending", expires_at: "2099-01-01T00:00:00Z",
    });
    (db.queryOne as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: "pub-1", name: "Acme Media", user_id: null, deleted_at: null })
      .mockResolvedValueOnce({ role: "agent" })
      .mockResolvedValueOnce(null);
    (repos.publishers.findByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (repos.publishers.linkUser as ReturnType<typeof vi.fn>).mockResolvedValue(publisher);
    (repos.publisherInvites.accept as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "accepted" });

    const result = await acceptPortalInvite("token-1", "user-1");
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE "user" SET role'), ["user-1"]);
    expect(repos.publishers.linkUser).toHaveBeenCalledWith("pub-1", "user-1");
    expect(repos.publisherInvites.accept).toHaveBeenCalledWith("token-1");
    expect(result.publisher.name).toBe("Acme Media");
  });

  it("rejects expired invites", async () => {
    (repos.publisherInvites.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      publisher_id: "pub-1", status: "pending", expires_at: "2020-01-01T00:00:00Z",
    });
    await expect(acceptPortalInvite("token-1", "user-1")).rejects.toThrow("Invite expired");
  });

  it("rejects used invites", async () => {
    (repos.publisherInvites.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      publisher_id: "pub-1", status: "accepted", expires_at: "2099-01-01T00:00:00Z",
    });
    await expect(acceptPortalInvite("token-1", "user-1")).rejects.toThrow("Invite already used");
  });

  it("rejects missing publishers", async () => {
    (repos.publisherInvites.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      publisher_id: "missing", status: "pending", expires_at: "2099-01-01T00:00:00Z",
    });
    (db.queryOne as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    await expect(acceptPortalInvite("token-1", "user-1")).rejects.toThrow("Publisher not found");
  });

  it("rejects users already linked to another publisher", async () => {
    (repos.publisherInvites.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      publisher_id: "pub-1", status: "pending", expires_at: "2099-01-01T00:00:00Z",
    });
    (db.queryOne as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "pub-1", user_id: null, deleted_at: null });
    (repos.publishers.findByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(publisher);
    await expect(acceptPortalInvite("token-1", "user-1")).rejects.toThrow("already linked");
  });

  it("rejects users with a non-default role", async () => {
    (repos.publisherInvites.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      publisher_id: "pub-1", status: "pending", expires_at: "2099-01-01T00:00:00Z",
    });
    (db.queryOne as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: "pub-1", user_id: null, deleted_at: null })
      .mockResolvedValueOnce({ role: "admin" });
    (repos.publishers.findByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(acceptPortalInvite("token-1", "user-1")).rejects.toThrow("different role");
  });

  it("rejects users who belong to an agency", async () => {
    (repos.publisherInvites.findByToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      publisher_id: "pub-1", status: "pending", expires_at: "2099-01-01T00:00:00Z",
    });
    (db.queryOne as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: "pub-1", user_id: null, deleted_at: null })
      .mockResolvedValueOnce({ role: "agent" })
      .mockResolvedValueOnce({ id: "membership-1" });
    (repos.publishers.findByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(acceptPortalInvite("token-1", "user-1")).rejects.toThrow("part of an agency");
  });
});
