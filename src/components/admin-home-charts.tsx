"use client";

import { BarChart, Bar, ResponsiveContainer } from "recharts";

interface VolPoint { date: string; count: number }
interface RevPoint { date: string; revenue_cents: number; count: number }
interface ConvPoint { date: string; total: number; connected: number; conversion_rate: number }
interface DurPoint { date: string; avg_seconds: number; total_calls: number }

export default function AdminHomeCharts({ volume, revenue, conversion, duration }: {
  volume: VolPoint[]; revenue: RevPoint[]; conversion: ConvPoint[]; duration: DurPoint[];
}) {
  return (
    <div className="admin-chart-grid">
      <div className="admin-chart-card">
        <span className="admin-chart-label">Call Volume</span>
        <span className="admin-chart-value">{volume.reduce((a, b) => a + b.count, 0)}</span>
        <ResponsiveContainer width="100%" height={52}>
          <BarChart data={volume}>
            <Bar dataKey="count" fill="var(--cyan)" radius={[1, 1, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="admin-chart-card">
        <span className="admin-chart-label">Revenue</span>
        <span className="admin-chart-value">${(revenue.reduce((a, b) => a + b.revenue_cents, 0) / 100).toLocaleString()}</span>
        <ResponsiveContainer width="100%" height={52}>
          <BarChart data={revenue.map((r) => ({ ...r, rev: r.revenue_cents / 100 }))}>
            <Bar dataKey="rev" fill="var(--accent)" radius={[1, 1, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="admin-chart-card">
        <span className="admin-chart-label">Conversion</span>
        <span className="admin-chart-value">{conversion.length > 0 ? `${conversion.at(-1)?.conversion_rate ?? 0}%` : "—"}</span>
        <ResponsiveContainer width="100%" height={52}>
          <BarChart data={conversion}>
            <Bar dataKey="conversion_rate" fill="var(--acid)" radius={[1, 1, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="admin-chart-card">
        <span className="admin-chart-label">Avg Duration</span>
        <span className="admin-chart-value">{duration.length > 0 ? `${Math.round(duration.reduce((a, b) => a + b.avg_seconds, 0) / duration.length / 60)}m` : "—"}</span>
        <ResponsiveContainer width="100%" height={52}>
          <BarChart data={duration}>
            <Bar dataKey="avg_seconds" fill="var(--orange)" radius={[1, 1, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
