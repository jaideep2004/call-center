"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCents } from "@/lib/format";

interface CallRow {
  id: string;
  uuid: string;
  caller: string | null;
  status: string | null;
  connected: boolean | null;
  payout_cents: number | null;
  recording_url: string | null;
  campaign_name: string | null;
  created_at: string;
}

const PAGE_SIZE = 25;

export default function PublisherCallsPage() {
  const [rows, setRows] = useState<CallRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/v1/publisher/calls?limit=${PAGE_SIZE}&page=${page}`);
    if (res.ok) {
      const body = await res.json();
      setRows(body.data?.rows ?? []);
      setTotal(body.data?.total ?? 0);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> PUBLISHER / CALLS</p>
          <h1>Calls</h1>
        </div>
        <p className="text-muted">{total} total</p>
      </div>

      <section className="card" style={{ padding: "var(--space-6)" }}>
        {loading ? (
          <div className="stack" style={{ gap: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <p><strong>No calls yet</strong></p>
            <p className="text-muted">Calls routed through your campaign will appear here.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Caller</th>
                <th>Campaign</th>
                <th>Status</th>
                <th>Recording</th>
                <th className="text-right">Payout</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{new Date(c.created_at).toLocaleString()}</td>
                  <td className="text-mono-sm">{c.caller ?? "—"}</td>
                  <td>{c.campaign_name ?? <span className="text-muted">—</span>}</td>
                  <td>
                    <span className={`badge ${c.connected ? "badge-success" : "badge-info"}`}>
                      {c.connected ? "Connected" : c.status ?? "—"}
                    </span>
                  </td>
                  <td>
                    {c.recording_url ? (
                      <a href={c.recording_url} target="_blank" rel="noopener noreferrer" className="clickable text-mono-sm">
                        ▶ Play
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="text-right text-mono-sm">{c.payout_cents ? formatCents(c.payout_cents) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && rows.length > 0 && (
          <div className="filter-bar" style={{ marginTop: "var(--space-4)", justifyContent: "space-between" }}>
            <span className="text-muted">Page {page} of {totalPages}</span>
            <div className="stack-h" style={{ gap: 8 }}>
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
              <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
