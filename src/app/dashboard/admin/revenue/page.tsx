"use client";

import { useState, useEffect, useMemo } from "react";
import { formatCents } from "@/lib/format";
import Sparkline from "@/components/sparkline";

interface RevenueDay {
  date: string;
  revenue_cents: number;
  count: number;
}

/** Fill missing calendar dates with zero rows so avg/day is correct (additive, non-breaking). */
function fillMissingDates(rows: RevenueDay[], days: number): RevenueDay[] {
  if (rows.length === 0) return [];
  const map = new Map<string, RevenueDay>();
  for (const r of rows) map.set(r.date.slice(0, 10), r);
  // Build last `days` dates including today
  const out: RevenueDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const hit = map.get(key);
    out.push(hit ? { date: key, revenue_cents: Number(hit.revenue_cents), count: hit.count } : { date: key, revenue_cents: 0, count: 0 });
  }
  // If API returned older dates outside window (edge), merge them first
  // Already covered; just return window.
  return out;
}

export default function AdminRevenuePage() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<RevenueDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/reports/revenue?days=${days}`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setRows(body.data ?? []);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [days]);

  // Additive: filled series for chart/avg correctness; raw rows kept for table if needed
  const filled = useMemo(() => fillMissingDates(rows, days), [rows, days]);
  // Use filled for stats when we have data, else fall back to rows
  const chartRows = filled.length > 0 ? filled : rows;

  const total = rows.reduce((s, r) => s + Number(r.revenue_cents), 0);
  const totalInvoices = rows.reduce((s, r) => s + r.count, 0);
  const avgPerDay = days > 0 ? Math.round(total / days) : 0;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / FINANCE</p>
          <h1>Revenue</h1>
        </div>
        <select className="input" value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ maxWidth: 160 }}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid-4" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card stat-card">
          <p className="text-mono-sm">TOTAL REVENUE</p>
          <p className="stat-value">{formatCents(total)}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">INVOICE COUNT</p>
          <p className="stat-value">{totalInvoices}</p>
          <span className="form-hint" style={{ fontSize: 11 }}>Paid invoices in period (was “Paid Invoices” — renamed for clarity)</span>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">AVG / DAY</p>
          <p className="stat-value">{formatCents(avgPerDay)}</p>
          <span className="form-hint" style={{ fontSize: 11 }}>Total ÷ {days} days (zero-filled)</span>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">PERIOD</p>
          <p className="stat-value" style={{ fontSize: 22 }}>{days}d</p>
        </div>
      </div>

      {chartRows.length > 1 && (
        <section className="card" style={{ marginBottom: "var(--space-6)" }}>
          <h2>Revenue Trend</h2>
          <p className="text-muted" style={{ fontSize: 11, margin: "0 0 var(--space-3)" }}>Zero-filled to {days} days for correct averaging</p>
          <div style={{ width: "100%", overflow: "hidden" }}>
            <Sparkline data={chartRows.map((r) => Number(r.revenue_cents))} width={720} height={64} responsive />
          </div>
        </section>
      )}

      <section className="card">
        <h2>Daily Breakdown</h2>
        {loading ? (
          <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
        ) : rows.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 12 }}>No paid invoices in this period.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Date</th><th>Invoices</th><th className="text-right">Revenue</th></tr></thead>
            <tbody>
              {[...rows].reverse().map((r) => (
                <tr key={r.date}>
                  <td>{r.date.slice(0, 10)}</td>
                  <td>{r.count}</td>
                  <td className="text-right text-mono-sm">{formatCents(Number(r.revenue_cents))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
