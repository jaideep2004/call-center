 "use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Agency {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency: string;
  recording_retention_days: number;
  created_at: string;
}

export default function AdminAgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/v1/agencies?${params}`).then(async (res) => {
      if (res.ok) {
        const b = await res.json();
        setAgencies(b.data ?? []);
      }
      setLoading(false);
    });
  }, [statusFilter]);

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / AGENCIES</p>
          <h1>Agency Oversight</h1>
        </div>
        <div className="search-bar">
          <span className="text-mono-sm">{agencies.length} agencies</span>
          <Link href="/dashboard/admin/agencies/new" className="btn btn-primary" style={{ fontSize: 11 }}>+ New Agency</Link>
        </div>
      </div>
      <div className="filter-bar">
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      {agencies.length === 0 ? (
        <div className="empty-state"><p>No agencies found.</p></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Currency</th>
              <th>Recording Retention</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {agencies.map((a) => (
              <tr key={a.id}>
                <td><strong>{a.name}</strong></td>
                <td className="text-mono-sm">{a.slug}</td>
                <td><span className={`badge${a.status === "active" ? " badge-success" : a.status === "suspended" ? " badge-danger" : ""}`}>{a.status}</span></td>
                <td className="text-mono-sm">{a.currency}</td>
                <td className="text-mono-sm">{a.recording_retention_days} days</td>
                <td className="text-mono-sm">{new Date(a.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
