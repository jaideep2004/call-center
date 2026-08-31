"use client";

import { useState, useEffect, useCallback } from "react";
import { showToast } from "@/lib/use-toast";

interface Reply { id: string; body: string; author_membership_id: string; created_at: string; }
interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  requester_membership_id: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "badge-warning", in_progress: "badge-info", resolved: "badge-success", closed: "",
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Ticket & { replies?: Reply[] } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const refresh = useCallback(() => {
    fetch(`/api/v1/support/tickets${statusFilter ? `?status=${statusFilter}` : ""}`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setTickets(body.data ?? []);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [statusFilter]);

  useEffect(refresh, [refresh]);

  async function openTicket(id: string) {
    const res = await fetch(`/api/v1/support/tickets/${id}`);
    if (res.ok) {
      const body = await res.json();
      setActive(body.data);
      setReplyText("");
    }
  }

  async function setStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/v1/support/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (res.ok) {
        showToast(`Status -> ${status}`, "success");
        refresh();
      } else {
        showToast(body.message ?? "Failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  async function sendReply() {
    if (!active || !replyText.trim()) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/v1/support/tickets/${active.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyText.trim() }),
      });
      if (res.ok) {
        setReplyText("");
        openTicket(active.id);
        showToast("Reply sent", "success");
      } else {
        showToast("Failed to send reply", "error");
      }
    } finally {
      setReplying(false);
    }
  }

  if (loading) return <div className="dashboard-page"><div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / SUPPORT</p>
          <h1>Support Queue</h1>
        </div>
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="split" style={{ "--gap": "1.5rem" } as React.CSSProperties}>
        <div className="card" style={{ flex: 1 }}>
          <h2>Tickets</h2>
          {tickets.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 12, padding: "var(--space-4) 0" }}>No tickets match.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Subject</th><th>Status</th><th>Priority</th><th>Actions</th></tr></thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="clickable" onClick={() => openTicket(t.id)}>{t.subject}</td>
                    <td><span className={`badge ${STATUS_COLORS[t.status] ?? ""}`}>{t.status}</span></td>
                    <td><span className="text-mono-sm">{t.priority}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <button className="btn btn-sm" onClick={() => setStatus(t.id, "in_progress")}>Start</button>
                        <button className="btn btn-sm" onClick={() => setStatus(t.id, "resolved")}>Resolve</button>
                        <button className="btn btn-sm" onClick={() => setStatus(t.id, "closed")}>Close</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {active && (
          <div className="card" style={{ flex: 1.2 }}>
            <h2>{active.subject}</h2>
            <div className="stack" style={{ gap: 8, marginTop: "var(--space-3)", maxHeight: 360, overflow: "auto" }}>
              {active.replies?.length === 0 && <p className="text-muted" style={{ fontSize: 12 }}>No replies yet.</p>}
              {active.replies?.map((r) => (
                <div key={r.id} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}>
                  <p style={{ fontSize: 13, whiteSpace: "pre-wrap", margin: 0 }}>{r.body}</p>
                  <p className="text-mono-sm" style={{ fontSize: 10, marginTop: 6 }}>{new Date(r.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="filter-bar" style={{ marginTop: "var(--space-3)" }}>
              <input className="input" placeholder="Reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-primary btn-sm" onClick={sendReply} disabled={replying || !replyText.trim()}>
                {replying ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
