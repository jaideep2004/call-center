"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";

interface VolPoint { date: string; count: number }
interface RevPoint { date: string; revenue_cents: number; count: number }
interface ConvPoint { date: string; total: number; connected: number; conversion_rate: number }
interface DurPoint { date: string; avg_seconds: number; total_calls: number }

const PIE_COLORS = ["#7C3AED", "#06B6D4", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6"];
const fmtDate = (d: string) => {
  try { const dt = new Date(d); return `${dt.getMonth() + 1}/${dt.getDate()}`; } catch { return d.slice(5, 10); }
};

const tooltipStyle = { background: "#0d1714", border: "1px solid #1e2d26", borderRadius: 8, fontSize: 12, color: "#e6f0ec" };

export default function AdminHomeCharts({ volume, revenue, conversion, duration }: {
  volume: VolPoint[]; revenue: RevPoint[]; conversion: ConvPoint[]; duration: DurPoint[];
}) {
  const [pieData, setPieData] = useState<{ name: string; value: number }[]>([]);
  // fetch call-state breakdown for pie (lightweight, no new API)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/calls?limit=80&sortBy=started_at&order=desc")
      .then(r => r.ok ? r.json() : null)
      .then(b => {
        if (cancelled || !b) return;
        const rows: { state: string }[] = b.data ?? b.rows ?? [];
        if (!Array.isArray(rows) || rows.length === 0) return;
        const counts = new Map<string, number>();
        for (const r of rows) counts.set(r.state || "unknown", (counts.get(r.state || "unknown") || 0) + 1);
        const arr = [...counts.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
        if (arr.length > 0) setPieData(arr);
      }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const revTrend = useMemo(() => revenue.map(r => ({ date: fmtDate(r.date), revenue: Math.round(r.revenue_cents / 100), count: r.count })), [revenue]);
  const volTrend = useMemo(() => volume.map(v => ({ date: fmtDate(v.date), count: v.count })), [volume]);
  const convTrend = useMemo(() => conversion.map(c => ({ date: fmtDate(c.date), rate: Number(c.conversion_rate) })), [conversion]);
  const durTrend = useMemo(() => duration.map(d => ({ date: fmtDate(d.date), sec: Math.round(d.avg_seconds) })), [duration]);

  const hasRevenue = revTrend.some(d => d.revenue > 0);
  const hasVolume = volTrend.some(d => d.count > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", margin: "var(--space-2) 0 var(--space-4)" }}>
      {/* 4 spark cards — now with animated Area/Line instead of tiny 52px bars */}
      <div className="admin-chart-grid">
        <div className="admin-chart-card">
          <span className="admin-chart-label">Call Volume · 7d</span>
          <span className="admin-chart-value">{volume.reduce((a, b) => a + b.count, 0)}</span>
          <span className="text-mono-sm" style={{ fontSize: 10, color: "var(--muted)" }}>{hasVolume ? "trend last 7 days" : "no data yet"}</span>
          <ResponsiveContainer width="100%" height={72}>
            <AreaChart data={volTrend} margin={{ left: 0, right: 0, top: 6, bottom: 0 }}>
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#9ab0a8" }} />
              <Area type="monotone" dataKey="count" stroke="#06B6D4" strokeWidth={1.8} fill="rgba(6,182,214,0.16)" dot={false} activeDot={{ r: 3 }} animationDuration={1100} animationBegin={0} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="admin-chart-card">
          <span className="admin-chart-label">Revenue · 7d</span>
          <span className="admin-chart-value">${(revenue.reduce((a, b) => a + b.revenue_cents, 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          <span className="text-mono-sm" style={{ fontSize: 10, color: "var(--muted)" }}>{hasRevenue ? "paid invoices" : "no revenue yet"}</span>
          <ResponsiveContainer width="100%" height={72}>
            <LineChart data={revTrend} margin={{ left: 0, right: 0, top: 6, bottom: 0 }}>
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#9ab0a8" }} formatter={(v: unknown) => [`$${String(v)}`, "Revenue"] as [string, string]} />
              <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} dot={{ r: 2, strokeWidth: 0, fill: "#10B981" }} activeDot={{ r: 4 }} animationDuration={1200} animationBegin={120} animationEasing="ease-out" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="admin-chart-card">
          <span className="admin-chart-label">Conversion · 7d</span>
          <span className="admin-chart-value">{conversion.length > 0 ? `${conversion.at(-1)?.conversion_rate ?? 0}%` : "—"}</span>
          <span className="text-mono-sm" style={{ fontSize: 10, color: "var(--muted)" }}>connected / total</span>
          <ResponsiveContainer width="100%" height={72}>
            <BarChart data={convTrend} margin={{ left: 0, right: 0, top: 6, bottom: 0 }} barCategoryGap="32%">
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${String(v)}%`, "Rate"] as [string, string]} />
              <Bar dataKey="rate" fill="#A3E635" radius={[3, 3, 0, 0]} animationDuration={1000} animationBegin={220} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="admin-chart-card">
          <span className="admin-chart-label">Avg Duration · 7d</span>
          <span className="admin-chart-value">{duration.length > 0 ? `${Math.round(duration.reduce((a, b) => a + b.avg_seconds, 0) / Math.max(1, duration.length))}s` : "—"}</span>
          <span className="text-mono-sm" style={{ fontSize: 10, color: "var(--muted)" }}>avg seconds</span>
          <ResponsiveContainer width="100%" height={72}>
            <LineChart data={durTrend} margin={{ left: 0, right: 0, top: 6, bottom: 0 }}>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${String(v)}s`, "Avg"] as [string, string]} />
              <Line type="monotone" dataKey="sec" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 3 }} animationDuration={1100} animationBegin={300} animationEasing="ease-out" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2 large animated charts: Revenue trend + Call-state pie */}
      <div className="admin-chart-main-grid">
        <div className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <span className="admin-chart-label">Revenue trend</span>
              <h3 style={{ margin: "2px 0 0", font: "600 14px var(--sans)", letterSpacing: "-0.02em" }}>Paid revenue · last 7 days</h3>
            </div>
            <span className="badge badge-success" style={{ fontSize: 11 }}>{hasRevenue ? "live" : "no data"}</span>
          </div>
          {revTrend.length === 0 || !hasRevenue ? (
            <div className="empty-state" style={{ padding: "28px 0", minHeight: 180, display: "grid", placeItems: "center" }}><p className="text-muted" style={{ fontSize: 12 }}>No revenue in last 7 days — chart will animate once invoices are paid.</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revTrend} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8a9791" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#8a9791" }} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`$${String(v)}`, "Revenue"] as [string, string]} />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2.2} fill="rgba(16,185,129,0.14)" dot={{ r: 2.5, fill: "#10B981", strokeWidth: 0 }} activeDot={{ r: 5 }} animationDuration={1300} animationBegin={100} animationEasing="ease-out" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <span className="admin-chart-label">Call states</span>
              <h3 style={{ margin: "2px 0 0", font: "600 14px var(--sans)", letterSpacing: "-0.02em" }}>Distribution · recent 80 calls</h3>
            </div>
            <span className="text-mono-sm" style={{ fontSize: 10, color: "var(--muted)" }}>{pieData.reduce((a, b) => a + b.value, 0) || 0} calls</span>
          </div>
          {pieData.length === 0 ? (
            <div className="empty-state" style={{ padding: "28px 0", minHeight: 180, display: "grid", placeItems: "center" }}><p className="text-muted" style={{ fontSize: 12 }}>No calls yet — pie will animate on first inbound.</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2} animationDuration={1100} animationBegin={200} animationEasing="ease-out" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={{ stroke: "rgba(255,255,255,0.2)" }}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="rgba(0,0,0,0.2)" />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {pieData.length > 0 && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {pieData.map((d, i) => (
                <span key={d.name} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)" }}>
                  <i style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], display: "inline-block" }} />{d.name} · {d.value}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
