"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface VolumePoint { date: string; count: number; }
interface RevenuePoint { date: string; revenue_cents: number; count: number; }
interface ConversionPoint { date: string; total: number; connected: number; conversion_rate: number; }
interface DurationPoint { date: string; avg_seconds: number; total_calls: number; }

export default function ReportsCharts({
  volume, revenue, conversion, duration,
}: {
  volume: VolumePoint[];
  revenue: RevenuePoint[];
  conversion: ConversionPoint[];
  duration: DurationPoint[];
}) {
  return (
    <div className="chart-grid">
      <div className="card chart-card">
        <h2>Call Volume</h2>
        {volume.length === 0 ? <p className="text-muted">No data yet.</p> : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={volume}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8a9791" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#8a9791" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#0d1714", border: "1px solid #1e2d26", borderRadius: 4, fontSize: 12 }} />
              <Bar dataKey="count" fill="var(--cyan)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="card chart-card">
        <h2>Revenue</h2>
        {revenue.length === 0 ? <p className="text-muted">No data yet.</p> : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={revenue.map((r) => ({ ...r, revenue: r.revenue_cents / 100 }))}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8a9791" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#8a9791" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#0d1714", border: "1px solid #1e2d26", borderRadius: 4, fontSize: 12 }} />
              <Bar dataKey="revenue" fill="var(--green)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="card chart-card">
        <h2>Conversion Rate</h2>
        {conversion.length === 0 ? <p className="text-muted">No data yet.</p> : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={conversion}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8a9791" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#8a9791" }} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#0d1714", border: "1px solid #1e2d26", borderRadius: 4, fontSize: 12 }} formatter={(v: unknown) => [`${v}%`, "Rate"] as [string, string]} />
              <Bar dataKey="conversion_rate" fill="var(--acid)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="card chart-card">
        <h2>Avg Call Duration</h2>
        {duration.length === 0 ? <p className="text-muted">No data yet.</p> : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={duration}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8a9791" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#8a9791" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#0d1714", border: "1px solid #1e2d26", borderRadius: 4, fontSize: 12 }} formatter={(v: unknown) => [`${v}s`, "Avg"] as [string, string]} />
              <Bar dataKey="avg_seconds" fill="var(--orange)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
