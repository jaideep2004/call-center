"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCents, formatDuration } from "@/lib/format";

interface TopPerformer {
  agent_id: string;
  call_count: number;
  total_seconds: number;
  total_cents: number;
  conversion_count: number;
  conversion_rate: number;
}

export default function TopPerformersPage() {
  const [rows, setRows] = useState<TopPerformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchPerformers = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/v1/agents/top-performers?days=${days}&limit=20`);
    if (res.ok) {
      const body = await res.json();
      setRows(body.data);
    }
    setLoading(false);
  }, [days]);

  useEffect(() => { fetchPerformers(); }, [fetchPerformers]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / TOP PERFORMERS</p>
          <h1>Top Performers</h1>
        </div>
        <div className="search-bar">
          <select className="select" value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ maxWidth: 100 }}>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
      </div>
      {loading ? (
        <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : rows.length === 0 ? (
        <div className="empty-state"><p>No performance data yet.</p></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Agent</th>
              <th>Calls</th>
              <th>Duration</th>
              <th>Revenue</th>
              <th>Conversions</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.agent_id}>
                <td className="text-mono-sm" style={{ color: "var(--muted)" }}>{i + 1}</td>
                <td className="text-mono-sm">{r.agent_id.slice(0, 8)}</td>
                <td className="text-mono-sm">{r.call_count}</td>
                <td className="text-mono-sm">{formatDuration(r.total_seconds)}</td>
                <td className="text-mono-sm">{formatCents(r.total_cents)}</td>
                <td className="text-mono-sm">{r.conversion_count}</td>
                <td><span className="badge badge-success">{r.conversion_rate}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
