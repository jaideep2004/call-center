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

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("normal");
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<Ticket & { replies?: Reply[] } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/v1/support/tickets?mine=1").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setTickets(body.data ?? []);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  async function openTicket(id: string) {
    const res = await fetch(`/api/v1/support/tickets/${id}`);
    if (res.ok) {
      const body = await res.json();
      setActive(body.data);
      setReplyText("");
    }
  }

  async function createTicket() {
    if (!subject.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), priority }),
      });
      const body = await res.json();
      if (res.ok) {
        setSubject("");
        showToast("Ticket created", "success");
        refresh();
      } else {
        showToast(body.message ?? "Failed", "error");
      }
    } finally {
      setCreating(false);
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
          <p className="eyebrow"><i /> OPERATIONS / SUPPORT</p>
          <h1>Support</h1>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-5)" }}>
        <h2>New Ticket</h2>
        <div className="filter-bar" style={{ marginTop: "var(--space-3)" }}>
          <input className="input" placeholder="What do you need help with?" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ flex: 1 }} />
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)} style={{ maxWidth: 130 }}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <button className="btn btn-primary" onClick={createTicket} disabled={creating || !subject.trim()}>
            {creating ? "Creating..." : "Submit"}
          </button>
        </div>
      </div>

      <div className="split" style={{ "--gap": "1.5rem" } as React.CSSProperties}>
        <div className="card" style={{ flex: 1 }}>
          <h2>My Tickets</h2>
          {tickets.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 12, padding: "var(--space-4) 0" }}>No tickets yet.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Subject</th><th>Status</th><th>Priority</th><th>Opened</th></tr></thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="clickable" onClick={() => openTicket(t.id)}>
                    <td>{t.subject}</td>
                    <td><span className={`badge ${STATUS_COLORS[t.status] ?? ""}`}>{t.status}</span></td>
                    <td><span className="text-mono-sm">{t.priority}</span></td>
                    <td className="text-mono-sm">{new Date(t.created_at).toLocaleDateString()}</td>
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
