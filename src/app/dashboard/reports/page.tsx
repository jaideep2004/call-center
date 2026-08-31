"use client";

import { useState, useEffect } from "react";
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

export default function ReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [volume, setVolume] = useState<VolumePoint[]>([]);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [conversion, setConversion] = useState<ConversionPoint[]>([]);
  const [duration, setDuration] = useState<DurationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

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
      if (vRes.ok) { const b = await vRes.json(); setVolume(b.data); }
      if (rRes.ok) { const b = await rRes.json(); setRevenue(b.data); }
      if (cRes.ok) { const b = await cRes.json(); setConversion(b.data); }
      if (dRes.ok) { const b = await dRes.json(); setDuration(b.data); }
      setLoading(false);
    }
    fetchAll();
  }, [days]);

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / REPORTS</p>
          <h1>Reports</h1>
        </div>
        <div className="search-bar">
          <select className="select" value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ maxWidth: 100 }}>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          <a className="btn btn-ghost" href="/api/v1/reports/export/calls" download>CSV</a>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card stat-card">
          <p className="text-mono-sm">CALLS</p>
          <p className="stat-value">{summary?.total_calls ?? 0}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">REVENUE</p>
          <p className="stat-value">{formatCents(summary?.total_revenue_cents ?? 0)}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">CAMPAIGNS</p>
          <p className="stat-value">{summary?.active_campaigns ?? 0}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">AGENTS ONLINE</p>
          <p className="stat-value">{summary?.agents_online ?? 0}</p>
        </div>
      </div>

      <Charts volume={volume} revenue={revenue} conversion={conversion} duration={duration} />
    </div>
  );
}
