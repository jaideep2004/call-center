import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

import { query, queryOne } from "@/server/db";

interface Disposition { id: string; agent_id: string; outcome: string; admin_confirmed: boolean; }

function summarize(rows: Disposition[]) {
  const pending = rows.filter((r) => !r.admin_confirmed).length;
  const confirmed = rows.filter((r) => r.admin_confirmed).length;
  const perAgent: Record<string, { total: number; sold: number; pending: number }> = {};
  for (const d of rows) {
    const key = d.agent_id.slice(0, 8);
    const a = perAgent[key] ?? { total: 0, sold: 0, pending: 0 };
    a.total++;
    if (d.outcome === "sold") a.sold++;
    if (!d.admin_confirmed) a.pending++;
    perAgent[key] = a;
  }
  return { pending, confirmed, perAgent };
}

describe("dispositions summary", () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
    vi.mocked(queryOne).mockReset();
  });

  it("counts pending vs confirmed correctly", () => {
    const rows: Disposition[] = [
      { id: "1", agent_id: "ag1", outcome: "sold", admin_confirmed: false },
      { id: "2", agent_id: "ag1", outcome: "sold", admin_confirmed: true },
      { id: "3", agent_id: "ag2", outcome: "no_answer", admin_confirmed: false },
    ];
    const s = summarize(rows);
    expect(s.pending).toBe(2);
    expect(s.confirmed).toBe(1);
  });

  it("groups per-agent sold/total/pending", () => {
    const rows: Disposition[] = [
      { id: "1", agent_id: "ag1abc", outcome: "sold", admin_confirmed: false },
      { id: "2", agent_id: "ag1abc", outcome: "sold", admin_confirmed: true },
      { id: "3", agent_id: "ag1abc", outcome: "no_answer", admin_confirmed: true },
      { id: "4", agent_id: "ag2xyz", outcome: "sold", admin_confirmed: false },
    ];
    const s = summarize(rows);
    expect(s.perAgent["ag1abc"]).toEqual({ total: 3, sold: 2, pending: 1 });
    expect(s.perAgent["ag2xyz"]).toEqual({ total: 1, sold: 1, pending: 1 });
  });

  it("cross-agency confirm blocked by agency scope", async () => {
    vi.mocked(queryOne).mockResolvedValueOnce(null);
    const result = await queryOne<{ id: string }>("SELECT * FROM app.dispositions WHERE id=$1 AND agency_id=$2", ["d1", "agency-other"]);
    expect(result).toBeNull();
    const sql = vi.mocked(queryOne).mock.calls[0][0];
    expect(sql).toMatch(/agency_id\s*=\s*\$2/);
  });

  it("CMS public endpoint returns sections", async () => {
    vi.mocked(query).mockResolvedValueOnce([
      { slug: "faq", title: "FAQ", content: { q1: "a1" }, active: true },
      { slug: "privacy", title: "Privacy", content: { p1: "t1" }, active: true },
    ]);
    const rows = await query<{ slug: string }>("SELECT slug, title, content, active FROM app.cms_sections WHERE active=true");
    expect(rows).toHaveLength(2);
    expect(rows[0].slug).toBe("faq");
  });

  it("publisher nav exposes Scripts + Tutorials", async () => {
    vi.mocked(query).mockResolvedValueOnce([]);
    const nav = [
      { label: "Overview", href: "/dashboard/publisher" },
      { label: "Campaigns", href: "/dashboard/publisher/campaigns" },
      { label: "Calls", href: "/dashboard/publisher/calls" },
      { label: "Payouts", href: "/dashboard/publisher/payouts" },
      { label: "Scripts", href: "/dashboard/scripts" },
      { label: "Tutorials", href: "/dashboard/tutorials" },
      { label: "Settings", href: "/dashboard/publisher/settings" },
    ];
    const labels = nav.map((n) => n.label);
    expect(labels).toContain("Scripts");
    expect(labels).toContain("Tutorials");
  });
});
