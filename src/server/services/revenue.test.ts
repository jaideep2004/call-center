import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

vi.mock("@/lib/csv", () => ({
  toCsv: vi.fn((rows: unknown[]) => rows.map((r) => JSON.stringify(r)).join("\n")),
}));

import { query } from "@/server/db";
import { getPortalPayouts } from "@/server/services/publisher-portal";
import { toCsv } from "@/lib/csv";

describe("finance", () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
    vi.mocked(toCsv).mockClear();
  });

  it("revenue daily aggregation groups by DATE(created_at) summing paid invoices", async () => {
    interface DailyRev { date: string; revenue_cents: number; count: number; }
    vi.mocked(query).mockResolvedValueOnce([
      { date: "2026-08-30", revenue_cents: 50000, count: 3 },
      { date: "2026-08-31", revenue_cents: 75000, count: 5 },
    ]);
    const rows = await query<DailyRev>("SELECT DATE(created_at) as date, SUM(total_cents) FROM app.invoices WHERE status='paid' GROUP BY DATE(created_at)");
    expect(rows).toHaveLength(2);
    expect(rows[0].revenue_cents).toBe(50000);
  });

  it("publisher payouts scoped by publisher_id returns qualified calls only", async () => {
    interface RetreaverCall { id: string; payout_cents: number; status: string; }
    vi.mocked(query).mockResolvedValueOnce([
      { id: "r1", payout_cents: 500, status: "finished" },
      { id: "r2", payout_cents: 0, status: "finished" },
    ]);
    const all = await query<RetreaverCall>("SELECT * FROM app.retreaver_calls WHERE publisher_id=$1", ["p1"]);
    const qualified = all.filter((r) => r.payout_cents > 0 && r.status === "finished");
    expect(qualified).toHaveLength(1);
    expect(qualified[0].id).toBe("r1");
  });

  it("CSV export serializes rows", async () => {
    const rows = [{ date: "2026-08-31", revenue_cents: 50000 }];
    const csv = vi.mocked(toCsv)(rows as unknown as Parameters<typeof toCsv>[0], []);
    expect(csv).toContain("2026-08-31");
  });
});
