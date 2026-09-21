import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({
  query: vi.fn(async () => []),
  queryOne: vi.fn(async () => ({ count: "0" })),
}));

import { query, queryOne } from "@/server/db";
import { agencies } from "./agencies";
import { agents } from "./agents";
import { campaigns } from "./campaigns";
import { calls } from "./calls";
import { scripts } from "./scripts";
import { tutorials } from "./tutorials";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(queryOne).mockResolvedValue({ count: "0" });
  vi.mocked(query).mockResolvedValue([]);
});

function allSql(): string[] {
  return [
    ...vi.mocked(queryOne).mock.calls.map((c) => String(c[0])),
    ...vi.mocked(query).mock.calls.map((c) => String(c[0])),
  ];
}

describe("soft-deleted rows never list", () => {
  it("agencies.findMany hides deleted", async () => {
    await agencies.findMany({ pagination: { page: 1, limit: 10 } });
    expect(allSql().join("\n")).toContain("deleted_at IS NULL");
  });

  it("agents.findMany hides deleted", async () => {
    await agents.findMany({ agencyId: "agency-1" });
    expect(allSql().join("\n")).toContain("a.deleted_at IS NULL");
  });

  it("campaigns.findMany hides deleted", async () => {
    await campaigns.findMany({ agencyId: "agency-1" });
    expect(allSql().join("\n")).toContain("deleted_at IS NULL");
  });

  it("calls.findMany hides deleted", async () => {
    await calls.findMany({ agencyId: "agency-1" });
    expect(allSql().join("\n")).toContain("deleted_at IS NULL");
  });

  it("scripts.findByAgency hides deleted", async () => {
    await scripts.findByAgency("agency-1");
    expect(allSql().join("\n")).toContain("deleted_at IS NULL");
  });

  it("tutorials.findByAgency hides deleted", async () => {
    await tutorials.findByAgency("agency-1");
    expect(allSql().join("\n")).toContain("deleted_at IS NULL");
  });
});
