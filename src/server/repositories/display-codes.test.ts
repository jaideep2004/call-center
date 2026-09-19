import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const queryMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any[]>>();
const queryOneMock = vi.fn<(sql: string, params?: unknown[]) => Promise<any>>();

vi.mock("@/server/db", () => ({
  query: (sql: string, params?: unknown[]) => queryMock(sql, params),
  queryOne: (sql: string, params?: unknown[]) => queryOneMock(sql, params),
}));

const { agents } = await import("./agents");
const { agencies } = await import("./agencies");
const { campaigns } = await import("./campaigns");
const { calls } = await import("./calls");
const { publishers } = await import("./publishers");
const { invoices } = await import("./invoices");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("display codes — repo contract (0050, UUIDs stay PKs)", () => {
  it("agents.create stamps AG-NNNN via sequence (no more CC prefix)", async () => {
    queryOneMock.mockResolvedValueOnce({ id: "ag-1", display_code: "AG-0042" });
    const row = await agents.create({ agency_id: "agency-1", membership_id: "m-1" });
    expect(row.display_code).toBe("AG-0042");
    const [sql] = queryOneMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("'AG-' || LPAD(nextval('app.agent_code_seq')::text, 4, '0')");
    expect(sql).not.toContain("'CC'");
  });

  it("agencies/calls/publishers/invoices omit display_code so the DB default assigns it", async () => {
    queryOneMock.mockResolvedValue({ id: "x1", display_code: "AC-0001" });
    await agencies.create({ name: "Acme", slug: "acme" });
    await calls.create({ agency_id: "a", campaign_id: "c", provider: "mock", provider_call_id: "p1" });
    await publishers.create({ name: "Pub" });
    await invoices.create({ agency_id: "a", call_id: "c1", total_cents: 1600, status: "pending" });
    for (const [sql] of queryOneMock.mock.calls as [string, unknown[]][]) {
      expect(sql).toContain("INSERT INTO");
      expect(sql).not.toContain("display_code");
    }
  });

  it("campaigns.create omits display_code (DB default assigns CA-NNNN)", async () => {
    queryOneMock
      .mockResolvedValueOnce({ id: "camp-1" }) // super.create INSERT
      .mockResolvedValueOnce({ id: "camp-1", display_code: "CA-0007" }); // findById
    const row = await campaigns.create({ agency_id: "a", name: "N", routing_strategy: "round_robin" });
    expect(row.display_code).toBe("CA-0007");
    const [insertSql] = queryOneMock.mock.calls[0] as [string, unknown[]];
    expect(insertSql).toContain("INSERT INTO app.campaigns");
    expect(insertSql).not.toContain("display_code");
  });
});

describe("0050 migration artifact", () => {
  const sql = readFileSync(resolve("supabase/migrations/0050_display_codes.sql"), "utf8");

  it("covers all six entities with sequences, backfills, and defaults", () => {
    for (const seq of ["agency_code_seq", "campaign_code_seq", "call_code_seq", "publisher_code_seq", "invoice_code_seq", "agent_code_seq"]) {
      expect(sql).toContain(seq);
    }
    for (const prefix of ["'AC-'", "'CA-'", "'CL-'", "'PB-'", "'IN-'", "'AG-'"]) {
      expect(sql).toContain(prefix);
    }
    expect(sql).toContain("LPAD(");
    expect(sql).not.toContain("CONCURRENTLY");
  });

  it("migrates legacy agent CC codes to AG- preserving numbers", () => {
    expect(sql).toContain("^CC[0-9]+$");
    expect(sql).toContain("substring(display_code FROM 3)");
  });
});
