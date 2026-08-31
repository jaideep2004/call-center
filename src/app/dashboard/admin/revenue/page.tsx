"use client";

import { useState, useEffect } from "react";
import { formatCents } from "@/lib/format";
import Sparkline from "@/components/sparkline";

interface RevenueDay {
  date: string;
  revenue_cents: number;
  count: number;
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

  const total = rows.reduce((s, r) => s + Number(r.revenue_cents), 0);
  const totalCalls = rows.reduce((s, r) => s + r.count, 0);

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
          <p className="text-mono-sm">PAID INVOICES</p>
          <p className="stat-value">{totalCalls}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">AVG / DAY</p>
          <p className="stat-value">{formatCents(rows.length > 0 ? Math.round(total / rows.length) : 0)}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">PERIOD</p>
          <p className="stat-value" style={{ fontSize: 22 }}>{days}d</p>
        </div>
      </div>

      {rows.length > 1 && (
        <section className="card" style={{ marginBottom: "var(--space-6)" }}>
          <h2>Revenue Trend</h2>
          <Sparkline data={rows.map((r) => Number(r.revenue_cents))} width={720} height={64} />
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
                  <td>{r.date}</td>
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
