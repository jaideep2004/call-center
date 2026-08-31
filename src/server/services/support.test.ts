import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

import { query, queryOne } from "@/server/db";
import { supportTickets } from "@/server/repositories";

describe("supportTickets repository", () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
    vi.mocked(queryOne).mockReset();
  });

  it("create inserts with agency + requester + default priority", async () => {
    const row = { id: "t1", agency_id: "a1", requester_membership_id: "m1", assignee_membership_id: null, subject: "Help", status: "open", priority: "normal", created_at: "2026-08-31", updated_at: "2026-08-31" };
    vi.mocked(queryOne).mockResolvedValueOnce(row);
    const r = await supportTickets.create({ agency_id: "a1", requester_membership_id: "m1", subject: "Help" });
    expect(r.id).toBe("t1");
    expect(vi.mocked(queryOne).mock.calls[0][1]).toEqual(["a1", "m1", "Help", "normal"]);
  });

  it("findManyForAgency filters by status when provided", async () => {
    vi.mocked(query).mockResolvedValueOnce([{ id: "t1" }]);
    const rows = await supportTickets.findManyForAgency("a1", "open");
    expect(rows).toHaveLength(1);
    const sql = vi.mocked(query).mock.calls[0][0];
    expect(sql).toMatch(/status\s*=\s*\$2/);
    expect(vi.mocked(query).mock.calls[0][1]).toEqual(["a1", "open"]);
  });

  it("findByIdForAgency scopes by agency_id", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const r = await supportTickets.findByIdForAgency("t1", "a1");
    expect(r).toBeNull();
    const sql = vi.mocked(queryOne).mock.calls[0][0];
    expect(sql).toMatch(/agency_id\s*=\s*\$2/);
  });

  it("setStatus updates with agency scope (cross-agency returns null)", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const r = await supportTickets.setStatus("t1", "closed", "a1");
    expect(r).toBeNull();
    expect(vi.mocked(queryOne).mock.calls[0][1]).toEqual(["t1", "closed", "a1"]);
  });

  it("addReply inserts reply with author", async () => {
    const reply = { id: "r1", ticket_id: "t1", author_membership_id: "m1", body: "hi", created_at: "2026-08-31" };
    vi.mocked(queryOne).mockResolvedValueOnce(reply);
    const r = await supportTickets.addReply("t1", "m1", "hi");
    expect(r.id).toBe("r1");
    expect(vi.mocked(queryOne).mock.calls[0][1]).toEqual(["t1", "m1", "hi"]);
  });
});
