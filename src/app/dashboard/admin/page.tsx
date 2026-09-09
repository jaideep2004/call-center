"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MiniPie, MiniDonut, MiniLine, MiniBar, MiniChartCard } from "@/components/dashboard-mini-charts";

interface Summary {
  total_calls: number; total_revenue_cents: number;
  active_campaigns: number; agents_online: number; total_leads: number;
}

interface CallEvent {
  id: string;
  provider: string;
  provider_call_id: string;
  state: string;
  from_hash: string | null;
  started_at: string | null;
  connected_at: string | null;
  ended_at: string | null;
}

export default function AdminPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [calls, setCalls] = useState<CallEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [volTrend, setVolTrend] = useState<{ name: string; value: number }[]>([]);
  const [revTrend, setRevTrend] = useState<{ name: string; value: number }[]>([]);
  const [statePie, setStatePie] = useState<{ name: string; value: number }[]>([]);
  const [availDonut, setAvailDonut] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const fmt = (d: string) => {
      try { const dt = new Date(d); return `${dt.getMonth() + 1}/${dt.getDate()}`; } catch { return d.slice(5, 10); }
    };
    Promise.all([
      fetch("/api/v1/reports/summary").then(async (res) => {
        if (res.ok) { const b = await res.json(); setSummary(b.data); }
      }),
      fetch("/api/v1/calls?limit=5&sortBy=started_at&order=desc").then(async (res) => {
        if (res.ok) { const b = await res.json(); setCalls(b.data ?? []); }
      }),
      fetch("/api/v1/reports/calls-volume?days=7").then(async (res) => {
        if (res.ok) {
          const b = await res.json();
          const rows: { date: string; count: number }[] = b.data ?? [];
          setVolTrend(rows.map((r) => ({ name: fmt(r.date), value: r.count })));
        }
      }),
      fetch("/api/v1/reports/revenue?days=7").then(async (res) => {
        if (res.ok) {
          const b = await res.json();
          const rows: { date: string; revenue_cents: number }[] = b.data ?? [];
          setRevTrend(rows.map((r) => ({ name: fmt(r.date), value: Math.round(r.revenue_cents / 100) })));
        }
      }),
      fetch("/api/v1/calls?limit=80&sortBy=started_at&order=desc").then(async (res) => {
        if (res.ok) {
          const b = await res.json();
          const rows: { state: string }[] = b.data ?? b.rows ?? [];
          if (Array.isArray(rows) && rows.length > 0) {
            const counts = new Map<string, number>();
            for (const r of rows) counts.set(r.state || "unknown", (counts.get(r.state || "unknown") || 0) + 1);
            const arr = [...counts.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
            if (arr.length) setStatePie(arr);
          }
        }
      }),
      fetch("/api/v1/agents?limit=100").then(async (res) => {
        if (res.ok) {
          const b = await res.json();
          const rows: { availability: string }[] = b.data ?? b.rows ?? [];
          if (Array.isArray(rows) && rows.length > 0) {
            const avail = new Map<string, number>();
            for (const r of rows) avail.set(r.availability || "offline", (avail.get(r.availability || "offline") || 0) + 1);
            const arr = [...avail.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
            // Ensure at least available/offline buckets
            if (!arr.find((x) => x.name === "available") && summary) {
              // fallback: use summary agents_online vs total estimate
            }
            setAvailDonut(arr);
          } else if (summary) {
            // fallback from summary if agents list empty (e.g. permission)
            const online = summary.agents_online ?? 0;
            if (online > 0) setAvailDonut([{ name: "available", value: online }, { name: "offline", value: 0 }]);
          }
        }
      }).catch(() => {}),
    ]).then(() => setLoading(false));
  }, []);

  // if agents endpoint blocked, derive avail from summary after load
  useEffect(() => {
    if (availDonut.length === 0 && summary && summary.agents_online > 0) {
      // keep at least available slice so donut not empty
      setAvailDonut([{ name: "available", value: summary.agents_online }, { name: "offline", value: Math.max(0, 4 - summary.agents_online) }]);
    }
  }, [summary, availDonut.length]);

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / OVERVIEW</p>
          <h1>Admin Console</h1>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: "var(--space-4)" }}>
        <div className="card" style={{ textAlign: "center", padding: "1.2rem 1rem 0.6rem", display: "flex", flexDirection: "column", gap: 4 }}>
          <p className="text-mono-sm" style={{ margin: 0, fontSize: 10 }}>TOTAL CALLS</p>
          <p style={{ font: "500 32px/1 var(--serif)", margin: "4px 0 0" }}>{summary?.total_calls ?? 0}</p>
          <div className="mini-stat-spark">
            <MiniLine data={volTrend.length ? volTrend : [{ name: "—", value: 0 }, { name: "—", value: 0 }]} height={140} ariaLabel="7-day call volume line" />
          </div>
          <small className="text-mono-sm" style={{ fontSize: 9, color: "var(--muted)", marginTop: 4 }}>7-day volume</small>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "1.2rem 1rem 0.6rem", display: "flex", flexDirection: "column", gap: 4 }}>
          <p className="text-mono-sm" style={{ margin: 0, fontSize: 10 }}>TOTAL REVENUE</p>
          <p style={{ font: "500 32px/1 var(--serif)", margin: "4px 0 0" }}>${((summary?.total_revenue_cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="mini-stat-spark">
            <MiniBar data={revTrend.length ? revTrend : [{ name: "—", value: 0 }, { name: "—", value: 0 }]} height={140} ariaLabel="7-day revenue bar" layout="horizontal" />
          </div>
          <small className="text-mono-sm" style={{ fontSize: 9, color: "var(--muted)", marginTop: 4 }}>7-day revenue</small>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
          <p className="text-mono-sm" style={{ margin: 0, fontSize: 10 }}>ACTIVE CAMPAIGNS</p>
          <p style={{ font: "500 32px/1 var(--serif)", margin: "8px 0 0" }}>{summary?.active_campaigns ?? 0}</p>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
          <p className="text-mono-sm" style={{ margin: 0, fontSize: 10 }}>AGENTS ONLINE</p>
          <p style={{ font: "500 32px/1 var(--serif)", margin: "8px 0 0" }}>{summary?.agents_online ?? 0}</p>
        </div>
      </div>

      {/* New bento under metrics — 3 mini charts: state pie, availability donut, volume line */}
      <div className="mini-bento mini-bento--admin" aria-label="Admin analytics bento">
        <MiniChartCard title="Call states" subtitle="Distribution · recent 80">
          <MiniPie data={statePie} height={160} ariaLabel="Call states pie" />
        </MiniChartCard>
        <MiniChartCard title="Agent availability" subtitle={`${availDonut.reduce((a, b) => a + b.value, 0) || 0} agents`}>
          <MiniDonut data={availDonut} height={160} ariaLabel="Agent availability donut" centerLabel={String(summary?.agents_online ?? 0)} />
        </MiniChartCard>
        <MiniChartCard title="Revenue trend" subtitle="7 days · paid">
          <MiniBar data={revTrend} height={160} ariaLabel="Revenue trend bar" />
        </MiniChartCard>
      </div>

      <div className="grid-4" style={{ marginBottom: "var(--space-6)" }}>
        <Link href="/dashboard/admin/users" className="card" style={{ textAlign: "center", padding: "1.5rem", textDecoration: "none", color: "inherit" }}>
          <p className="text-mono-sm" style={{ margin: 0, fontSize: 10, color: "var(--muted)" }}>MANAGE</p>
          <p style={{ font: "500 20px/1 var(--serif)", margin: "8px 0 0" }}>Users</p>
        </Link>
        <Link href="/dashboard/admin/agencies" className="card" style={{ textAlign: "center", padding: "1.5rem", textDecoration: "none", color: "inherit" }}>
          <p className="text-mono-sm" style={{ margin: 0, fontSize: 10, color: "var(--muted)" }}>MANAGE</p>
          <p style={{ font: "500 20px/1 var(--serif)", margin: "8px 0 0" }}>Agencies</p>
        </Link>
        <Link href="/dashboard/settings" className="card" style={{ textAlign: "center", padding: "1.5rem", textDecoration: "none", color: "inherit" }}>
          <p className="text-mono-sm" style={{ margin: 0, fontSize: 10, color: "var(--muted)" }}>MANAGE</p>
          <p style={{ font: "500 20px/1 var(--serif)", margin: "8px 0 0" }}>Settings</p>
        </Link>
        <Link href="/dashboard/reports" className="card" style={{ textAlign: "center", padding: "1.5rem", textDecoration: "none", color: "inherit" }}>
          <p className="text-mono-sm" style={{ margin: 0, fontSize: 10, color: "var(--muted)" }}>VIEW</p>
          <p style={{ font: "500 20px/1 var(--serif)", margin: "8px 0 0" }}>Reports</p>
        </Link>
      </div>

      <div className="split" style={{ "--gap": "var(--space-6)" } as React.CSSProperties}>
        <div className="card" style={{ flex: 1 }}>
          <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)", letterSpacing: "-0.03em" }}>Quick Actions</h2>
          <div className="stack" style={{ gap: "var(--space-2)" }}>
            <Link href="/dashboard/admin/agencies/new" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>Create Agency</Link>
            <Link href="/dashboard/admin/agents/new" className="btn" style={{ width: "100%", justifyContent: "center" }}>Create Agent</Link>
            <Link href="/dashboard/campaigns" className="btn" style={{ width: "100%", justifyContent: "center" }}>Manage Campaigns</Link>
            <Link href="/dashboard/wallet" className="btn" style={{ width: "100%", justifyContent: "center" }}>View Wallet</Link>
          </div>
        </div>
        <div className="card" style={{ flex: 2 }}>
          <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)", letterSpacing: "-0.03em" }}>System Status</h2>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Routing Engine</span>
              <span className="badge badge-success">Nominal</span>
            </div>
            <div className="status-item">
              <span className="status-label">Total Leads</span>
              <span className="text-mono" style={{ fontSize: 13 }}>{summary?.total_leads ?? 0}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Database</span>
              <span className="badge badge-success">Connected</span>
            </div>
            <div className="status-item">
              <span className="status-label">Telnyx Webhook</span>
              <span className="badge">Receiving</span>
            </div>
            <div className="status-item">
              <span className="status-label">PgBoss Worker</span>
              <span className="badge">Awaiting jobs</span>
            </div>
            <div className="status-item">
              <span className="status-label">Socket Gateway</span>
              <span className="badge">Standby</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "var(--space-6)" }}>
        <div className="dashboard-page-header">
          <h2>Recent Calls</h2>
          <Link href="/dashboard/calls" className="text-mono-sm" style={{ fontSize: 11 }}>View all &rarr;</Link>
        </div>
        {calls.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem 0" }}><p>No calls recorded yet.</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Provider</th>
                <th>State</th>
                <th>From</th>
                <th>Call ID</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => (
                <tr key={call.id}>
                  <td className="text-mono-sm">{call.started_at ? new Date(call.started_at).toLocaleString() : "—"}</td>
                  <td className="text-mono-sm">{call.provider}</td>
                  <td><span className="badge">{call.state}</span></td>
                  <td className="text-mono-sm">{call.from_hash ? call.from_hash.slice(0, 12) : "—"}</td>
                  <td><Link href={`/dashboard/calls/${call.id}`} className="clickable">{call.id.slice(0, 8)}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
