"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { authClient } from "@/lib/auth-client";
import Sparkline from "@/components/sparkline";

const AdminCharts = dynamic(() => import("@/components/admin-home-charts"), { ssr: false });

interface Summary {
  total_calls: number; total_revenue_cents: number;
  active_campaigns: number; agents_online: number; total_leads: number;
}

interface LiveCall {
  id: string; from_hash: string; state: string; started_at: string;
  campaign_id: string; agent_id: string | null;
}

interface VolumePoint {
  date: string; count: number;
}

interface DurationPoint {
  date: string; avg_seconds: number; total_calls: number;
}

interface RevenuePoint {
  date: string; revenue_cents: number; count: number;
}

interface ConversionPoint {
  date: string; total: number; connected: number; conversion_rate: number;
}

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role;
  const isAdmin = role === "admin" || role === "super_admin";
  const [summary, setSummary] = useState<Summary | null>(null);
  const [liveCalls, setLiveCalls] = useState<LiveCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [volData, setVolData] = useState<VolumePoint[]>([]);
  const [durData, setDurData] = useState<DurationPoint[]>([]);
  const [revData, setRevData] = useState<RevenuePoint[]>([]);
  const [convData, setConvData] = useState<ConversionPoint[]>([]);
  const [recentCalls, setRecentCalls] = useState<LiveCall[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/reports/summary").then(r => r.ok ? r.json() : null),
      fetch("/api/v1/calls?state=ringing,connected&limit=5").then(r => r.ok ? r.json() : null),
      fetch("/api/v1/reports/calls-volume?days=7").then(r => r.ok ? r.json() : null),
      fetch("/api/v1/reports/duration?days=7").then(r => r.ok ? r.json() : null),
      fetch("/api/v1/reports/revenue?days=7").then(r => r.ok ? r.json() : null),
      fetch("/api/v1/reports/conversion?days=7").then(r => r.ok ? r.json() : null),
      fetch("/api/v1/calls?limit=5&sort=started_at:desc").then(r => r.ok ? r.json() : null),
    ]).then(([s, c, v, d, rv, cv, rc]) => {
      if (s) setSummary(s.data);
      if (c) setLiveCalls(c.data ?? []);
      if (v) setVolData(v.data ?? []);
      if (d) setDurData(d.data ?? []);
      if (rv) setRevData(rv.data ?? []);
      if (cv) setConvData(cv.data ?? []);
      if (rc) setRecentCalls(rc.data ?? []);
      setLoading(false);
    });
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = user?.name?.split(" ")[0] ?? "Operator";

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="stack" style={{ gap: 24 }}>
          <div className="skeleton skeleton-text" style={{ width: 200 }} />
          <div className="skeleton skeleton-text" style={{ width: 320 }} />
          <div className="metrics">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" style={{ height: 100 }} />)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="console-header">
        <div>
          <p className="eyebrow"><i /> {isAdmin ? "ADMIN CONTROL PLANE" : "AGENT CONSOLE"}</p>
          <h1>{greeting}, {firstName}.</h1>
        </div>
        <div className="header-right">
          <span className="clock">{new Date().toLocaleTimeString("en-US", { hour12: false })} CT</span>
          {isAdmin && <Link href="/dashboard/admin/agencies/new" className="btn btn-primary">+ New agency</Link>}
        </div>
      </header>
      {isAdmin ? (
        <>
        <div className="status-band">
          <span><i /> ADMIN PANEL</span>
          <span>{summary?.agents_online ?? 0} agents online</span>
          <span>{summary?.active_campaigns ?? 0} active campaigns</span>
          <span>Last sync: now</span>
        </div>

        <div className="metrics">
          <Metric label="Total calls" value={String(summary?.total_calls ?? 0)} detail={`${summary?.active_campaigns ?? 0} active campaigns`} />
          <Metric label="Agents online" value={String(summary?.agents_online ?? 0)} detail="Across all agencies" />
          <Metric label="Total leads" value={String(summary?.total_leads ?? 0)} detail="In pipeline" />
          <Metric label="Revenue" value={summary ? `$${((summary.total_revenue_cents ?? 0) / 100).toLocaleString()}` : "$0"} detail="Current cycle" />
        </div>

        <AdminCharts volume={volData} revenue={revData} conversion={convData} duration={durData} />

        <div className="dashboard-grid">
          <section className="panel live-panel">
            <div className="panel-head">
              <div>
                <span className="section-label">LIVE QUEUE</span>
                <h2>Call movement</h2>
              </div>
              <Link href="/dashboard/admin/dispositions" className="quiet-button">Dispositions &rarr;</Link>
            </div>
            <div className="call-list">
              {liveCalls.length === 0 ? (
                <div className="empty-state"><p>No live calls</p></div>
              ) : liveCalls.map((c) => (
                <Link href={`/dashboard/calls/${c.id}`} className="call-row" key={c.id}>
                  <span className="call-id">{c.id.slice(0, 8)}</span>
                  <div>
                    <strong>{c.from_hash?.slice(0, 14) ?? "Anonymous"}</strong>
                    <small>{c.campaign_id?.slice(0, 8) ?? "—"}</small>
                  </div>
                  <span className={`state ${c.state}`}>{c.state}</span>
                  <button aria-label={`Open ${c.id}`}>&#8599;</button>
                </Link>
              ))}
            </div>
          </section>

          <section className="panel route-panel">
            <div className="panel-head">
              <div>
                <span className="section-label">AGENCY OVERVIEW</span>
                <h2>Quick actions</h2>
              </div>
            </div>
            <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 8 }}>
              <Link href="/dashboard/agents" className="btn btn-primary btn-sm">Manage Agents</Link>
              <Link href="/dashboard/admin/agencies" className="btn btn-sm">View Agencies</Link>
              <Link href="/dashboard/agents/recruit" className="btn btn-sm">Recruit Agents</Link>
            </div>
          </section>
        </div>
        </>
      ) : (
        <>
        <div className="agent-home">
          <section className="agent-softphone-panel">
            <div className="panel agent-status-card">
              <div className="panel-head">
                <div>
                  <span className="section-label">STATUS</span>
                  <h2>Ready</h2>
                </div>
              </div>
              <div className="agent-big-toggle">
                <span className="pulse-dot" />
                <span>Available</span>
                <span className="text-mono-sm" style={{ color: "var(--muted)", fontSize: 10 }}>
                  {summary?.agents_online ?? 0} agents online
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: "var(--space-4)" }}>
                <Link href="/dashboard/take-calls" className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                  Go to Softphone
                </Link>
                <Link href="/dashboard/calls" className="btn btn-sm" style={{ flex: 1 }}>
                  Call History
                </Link>
              </div>
              {recentCalls.length > 0 && (
                <div className="call-list" style={{ marginTop: "var(--space-4)" }}>
                  <span className="section-label" style={{ display: "block", marginBottom: 6 }}>RECENT ACTIVITY</span>
                  {recentCalls.slice(0, 3).map((c) => (
                    <Link href={`/dashboard/calls/${c.id}`} className="call-row" key={c.id}>
                      <span className="call-id">{c.id.slice(0, 8)}</span>
                      <div>
                        <strong>{c.from_hash?.slice(0, 14) ?? "Anonymous"}</strong>
                        <small>{new Date(c.started_at).toLocaleTimeString()}</small>
                      </div>
                      <span className={`state ${c.state}`}>{c.state}</span>
                    </Link>
                  ))}
                </div>
              )}
              {recentCalls.length === 0 && (
                <div className="empty-state" style={{ marginTop: "var(--space-6)" }}>
                  <p>Ready for your first call. Go online above.</p>
                </div>
              )}
            </div>
          </section>

          <section className="agent-trends-panel">
            <div className="panel">
              <div className="panel-head">
                <div>
                  <span className="section-label">7-DAY CALL VOLUME</span>
                  <h2>{volData.reduce((a, b) => a + b.count, 0)} total</h2>
                </div>
              </div>
              <Sparkline data={volData.map((d) => d.count)} width={280} height={52} />
            </div>

            <div className="panel">
              <div className="panel-head">
                <div>
                  <span className="section-label">7-DAY AVG DURATION</span>
                  <h2>{durData.length > 0 ? `${Math.round(durData.reduce((a, b) => a + b.avg_seconds, 0) / durData.length / 60)}m avg` : "—"}</h2>
                </div>
              </div>
              <Sparkline data={durData.map((d) => d.avg_seconds)} width={280} height={52} />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/dashboard/wallet/agent" className="btn btn-sm" style={{ flex: 1 }}>My Wallet</Link>
              <Link href="/dashboard/reports" className="btn btn-sm" style={{ flex: 1 }}>Reports</Link>
            </div>
          </section>
        </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, detail, live }: { label: string; value: string; detail: string; live?: boolean }) {
  return (
    <article className="metric">
      <span>{live && <i className="pulse-dot" />}{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
