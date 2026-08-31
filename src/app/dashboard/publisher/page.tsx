"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCents } from "@/lib/format";

interface Overview {
  publisher: { id: string; name: string; fixed_price_cents: number | null; retreaver_status: string };
  stats: { total_calls: number; qualified_calls: number; payout_cents: number };
  campaigns: {
    campaign_id: string | null;
    campaign_name: string | null;
    price_cents: number | null;
    calls: number;
    qualified_calls: number;
    payout_cents: number;
  }[];
}

interface CallRow {
  id: string;
  uuid: string;
  caller: string | null;
  status: string | null;
  connected: boolean | null;
  payout_cents: number | null;
  campaign_name: string | null;
  created_at: string;
}

export default function PublisherOverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [recent, setRecent] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [ovRes, callsRes] = await Promise.all([
      fetch("/api/v1/publisher/overview"),
      fetch("/api/v1/publisher/calls?limit=8"),
    ]);
    if (ovRes.ok) {
      const body = await ovRes.json();
      setOverview(body.data ?? null);
    }
    if (callsRes.ok) {
      const body = await callsRes.json();
      setRecent(body.data?.rows ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="stack" style={{ gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> PUBLISHER / OVERVIEW</p>
          <h1>{overview?.publisher.name ?? "Overview"}</h1>
        </div>
        <span className={`badge ${overview?.publisher.retreaver_status === "active" ? "badge-success" : overview?.publisher.retreaver_status === "paused" ? "badge-warning" : "badge-info"}`}>
          {overview?.publisher.retreaver_status ?? "—"}
        </span>
      </div>

      <div className="grid-4" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card stat-card">
          <p className="text-mono-sm">CALLS</p>
          <p className="stat-value">{overview?.stats.total_calls ?? 0}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">QUALIFIED CALLS</p>
          <p className="stat-value">{overview?.stats.qualified_calls ?? 0}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">EARNED</p>
          <p className="stat-value">{formatCents(overview?.stats.payout_cents ?? 0)}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">PAYOUT PER CALL</p>
          <p className="stat-value">{overview?.publisher.fixed_price_cents ? formatCents(overview.publisher.fixed_price_cents) : "—"}</p>
        </div>
      </div>

      <section className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        <h2 style={{ font: "500 18px var(--serif)", marginBottom: "var(--space-4)" }}>Campaigns</h2>
        {(overview?.campaigns.length ?? 0) === 0 ? (
          <div className="empty-state">
            <p><strong>No campaign data yet</strong></p>
            <p className="text-muted">Once calls are attributed to you, they&apos;ll appear here per campaign.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Buyer price</th>
                <th>Calls</th>
                <th>Qualified</th>
                <th className="text-right">Payout</th>
              </tr>
            </thead>
            <tbody>
              {overview!.campaigns.map((c) => (
                <tr key={c.campaign_id ?? "unassigned"}>
                  <td>{c.campaign_name ?? <span className="text-muted">Unassigned</span>}</td>
                  <td>{c.price_cents ? formatCents(c.price_cents) : "—"}</td>
                  <td>{c.calls}</td>
                  <td>{c.qualified_calls}</td>
                  <td className="text-right text-mono-sm">{formatCents(c.payout_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card" style={{ padding: "var(--space-6)" }}>
        <h2 style={{ font: "500 18px var(--serif)", marginBottom: "var(--space-4)" }}>Recent calls</h2>
        {recent.length === 0 ? (
          <div className="empty-state">
            <p><strong>No calls yet</strong></p>
            <p className="text-muted">Calls routed through your campaign will appear here.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Caller</th>
                <th>Campaign</th>
                <th>Status</th>
                <th className="text-right">Payout</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id}>
                  <td>{new Date(c.created_at).toLocaleString()}</td>
                  <td className="text-mono-sm">{c.caller ?? "—"}</td>
                  <td>{c.campaign_name ?? <span className="text-muted">—</span>}</td>
                  <td>
                    <span className={`badge ${c.connected ? "badge-success" : "badge-info"}`}>
                      {c.connected ? "Connected" : c.status ?? "—"}
                    </span>
                  </td>
                  <td className="text-right text-mono-sm">{c.payout_cents ? formatCents(c.payout_cents) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
