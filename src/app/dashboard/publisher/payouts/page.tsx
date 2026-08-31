"use client";

import { useState, useEffect } from "react";
import { formatCents } from "@/lib/format";

interface Payouts {
  summary: {
    total_payout_cents: number;
    qualified_calls: number;
    last_30d_payout_cents: number;
    last_30d_qualified_calls: number;
  };
  monthly: { month: string; payout_cents: number; qualified_calls: number }[];
  recent_qualified: {
    id: string;
    caller: string | null;
    payout_cents: number | null;
    campaign_name: string | null;
    created_at: string;
  }[];
}

export default function PublisherPayoutsPage() {
  const [data, setData] = useState<Payouts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/publisher/payouts").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setData(body.data ?? null);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="dashboard-page"><div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> PUBLISHER / PAYOUTS</p>
          <h1>Payouts</h1>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card stat-card">
          <p className="text-mono-sm">TOTAL PAYOUTS</p>
          <p className="stat-value">{formatCents(data?.summary.total_payout_cents ?? 0)}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">QUALIFIED CALLS</p>
          <p className="stat-value">{data?.summary.qualified_calls ?? 0}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">LAST 30 DAYS</p>
          <p className="stat-value">{formatCents(data?.summary.last_30d_payout_cents ?? 0)}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">30-DAY QUALIFIED</p>
          <p className="stat-value">{data?.summary.last_30d_qualified_calls ?? 0}</p>
        </div>
      </div>

      <section className="card" style={{ marginBottom: "var(--space-6)" }}>
        <h2>Monthly History</h2>
        {!data || data.monthly.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 12 }}>No payout history yet.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Month</th><th>Qualified Calls</th><th className="text-right">Payout</th></tr></thead>
            <tbody>
              {data.monthly.map((m) => (
                <tr key={m.month}>
                  <td>{m.month}</td>
                  <td>{m.qualified_calls}</td>
                  <td className="text-right text-mono-sm">{formatCents(m.payout_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Recent Qualified Calls</h2>
        {!data || data.recent_qualified.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 12 }}>No qualified calls yet.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Date</th><th>Caller</th><th>Campaign</th><th className="text-right">Payout</th></tr></thead>
            <tbody>
              {data.recent_qualified.map((c) => (
                <tr key={c.id}>
                  <td>{new Date(c.created_at).toLocaleString()}</td>
                  <td className="text-mono-sm">{c.caller ?? "—"}</td>
                  <td>{c.campaign_name ?? "—"}</td>
                  <td className="text-right text-mono-sm">{formatCents(c.payout_cents ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
