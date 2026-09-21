import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => ({ count: "0" })),
}));

import { query, queryOne } from "@/server/db";
import { memberships } from "./memberships";
import { leads } from "./leads";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(queryOne).mockResolvedValue({ count: "0" });
  vi.mocked(query).mockResolvedValue([]);
});

function allSql(): string {
  return [
    ...vi.mocked(queryOne).mock.calls.map((c) => String(c[0])),
    ...vi.mocked(query).mock.calls.map((c) => String(c[0])),
  ].join("\n");
}

describe("list query safety (live 42703/42702 regressions)", () => {
  it("memberships.findMany never orders by created_at (column does not exist)", async () => {
    await memberships.findMany({ pagination: { page: 1, limit: 100 }, filters: { agency_id: "a1" } });
    const sql = allSql();
    expect(sql).not.toContain("created_at");
    expect(sql).toContain("ORDER BY id DESC");
  });

  it("leads.findManyWithFilters qualifies shared columns (no ambiguity with joins)", async () => {
    await leads.findManyWithFilters({ agencyId: "a1", status: "new", source: "web" });
    const sql = allSql();
    expect(sql).toContain("l.agency_id = $1");
    expect(sql).toContain("l.deleted_at IS NULL");
    expect(sql).toContain("ORDER BY l.created_at DESC");
    expect(sql).not.toMatch(/WHERE agency_id/);
  });
});
