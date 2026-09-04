"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { formatCents } from "@/lib/format";

const Charts = dynamic(() => import("@/components/reports-charts"), { ssr: false });

interface Summary {
  total_calls: number;
  total_revenue_cents: number;
  active_campaigns: number;
  agents_online: number;
  total_leads: number;
}

interface VolumePoint { date: string; count: number; }
interface RevenuePoint { date: string; revenue_cents: number; count: number; }
interface ConversionPoint { date: string; total: number; connected: number; conversion_rate: number; }
interface DurationPoint { date: string; avg_seconds: number; total_calls: number; }

function ReportsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDays = Number(searchParams.get("days") ?? "30") || 30;

  const [summary, setSummary] = useState<Summary | null>(null);
  const [volume, setVolume] = useState<VolumePoint[]>([]);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [conversion, setConversion] = useState<ConversionPoint[]>([]);
  const [duration, setDuration] = useState<DurationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(initialDays);

  useEffect(() => {
    async function fetchAll() {
      const [sRes, vRes, rRes, cRes, dRes] = await Promise.all([
        fetch("/api/v1/reports/summary"),
        fetch(`/api/v1/reports/calls-volume?days=${days}`),
        fetch(`/api/v1/reports/revenue?days=${days}`),
        fetch(`/api/v1/reports/conversion?days=${days}`),
        fetch(`/api/v1/reports/duration?days=${days}`),
      ]);
      if (sRes.ok) { const b = await sRes.json(); setSummary(b.data); }
      if (vRes.ok) { const b = await vRes.json(); setVolume(b.data ?? []); }
      if (rRes.ok) { const b = await rRes.json(); setRevenue(b.data ?? []); }
      if (cRes.ok) { const b = await cRes.json(); setConversion(b.data ?? []); }
      if (dRes.ok) { const b = await dRes.json(); setDuration(b.data ?? []); }
      setLoading(false);
    }
    fetchAll();
  }, [days]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (days !== 30) p.set("days", String(days));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [days, router, searchParams]);

  if (loading) return <div className="dashboard-page"><div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" style={{ height: 80 }} />)}</div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ANALYTICS / REPORTS</p>
          <h1>Reports</h1>
        </div>
        <div className="filter-bar filter-bar--plain" style={{ flex: "0 1 auto", padding: 0, background: "transparent", border: 0, gap: 12 }}>
          <div className="filter-bar__group">
            <label className="text-mono-sm" style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>Range</label>
            <select className="select" value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ minWidth: 140 }}>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
          <div className="filter-bar__segment">
            <a className="btn btn-ghost btn-sm" href="/api/v1/reports/export/calls" download>CSV</a>
            <a className="btn btn-ghost btn-sm" href="/api/v1/reports/export/calls?format=xlsx" download>Excel</a>
          </div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 4 }}>
        <div className="card stat-card" style={{ borderLeft: "3px solid var(--accent)" }}>
          <p className="text-mono-sm">CALLS</p>
          <p className="stat-value">{summary?.total_calls ?? 0}</p>
        </div>
        <div className="card stat-card" style={{ borderLeft: "3px solid var(--cyan)" }}>
          <p className="text-mono-sm">REVENUE</p>
          <p className="stat-value">{formatCents(summary?.total_revenue_cents ?? 0)}</p>
        </div>
        <div className="card stat-card" style={{ borderLeft: "3px solid var(--acid)" }}>
          <p className="text-mono-sm">CAMPAIGNS</p>
          <p className="stat-value">{summary?.active_campaigns ?? 0}</p>
        </div>
        <div className="card stat-card" style={{ borderLeft: "3px solid var(--orange)" }}>
          <p className="text-mono-sm">AGENTS ONLINE</p>
          <p className="stat-value">{summary?.agents_online ?? 0}</p>
        </div>
      </div>

      <div className="card card--spacious" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <Charts volume={volume} revenue={revenue} conversion={conversion} duration={duration} />
        </div>
      </div>

      {volume.length === 0 && revenue.length === 0 && (
        <div className="empty-state" style={{ marginTop: "var(--space-6)" }}><p>No report data yet. Once calls are recorded, trends will appear here.</p></div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <ReportsInner />
    </Suspense>
  );
}
