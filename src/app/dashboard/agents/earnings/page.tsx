"use client";

import { useState, useEffect, useCallback } from "react";

interface EarningsRow {
  agent_id: string;
  call_count: number;
  total_seconds: number;
  total_cents: number;
  avg_cents: number;
}

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatCents(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

export default function AgentEarningsPage() {
  const [rows, setRows] = useState<EarningsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const res = await fetch(`/api/v1/agents/earnings?${params}`);
    if (res.ok) {
      const body = await res.json();
      setRows(body.data);
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);

  const totalCents = rows.reduce((s, r) => s + r.total_cents, 0);
  const totalCalls = rows.reduce((s, r) => s + r.call_count, 0);

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / AGENT EARNINGS</p>
          <h1>Agent Earnings</h1>
        </div>
        <div className="search-bar">
          <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ maxWidth: 160 }} />
          <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ maxWidth: 160 }} />
          <span className="text-mono-sm">{formatCents(totalCents)} total · {totalCalls} calls</span>
        </div>
      </div>
      {loading ? (
        <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : rows.length === 0 ? (
        <div className="empty-state"><p>No earnings data found.</p></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Calls</th>
              <th>Duration</th>
              <th>Total</th>
              <th>Avg / Call</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.agent_id}>
                <td className="text-mono-sm">{r.agent_id.slice(0, 8)}</td>
                <td className="text-mono-sm">{r.call_count}</td>
                <td className="text-mono-sm">{formatDuration(r.total_seconds)}</td>
                <td className="text-mono-sm">{formatCents(r.total_cents)}</td>
                <td className="text-mono-sm">{formatCents(r.avg_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
