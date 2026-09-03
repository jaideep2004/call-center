"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
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
const PRIORITY_COLORS: Record<string, string> = {
  low: "", normal: "badge-info", high: "badge-warning", urgent: "badge-danger",
};
const PAGE_SIZE = 10;

function SupportInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialStatus = searchParams.get("status") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("normal");
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<Ticket & { replies?: Reply[] } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [page, setPage] = useState(initialPage);
  const hasMounted = useRef(false);

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

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchInput.trim().toLowerCase();
      if (trimmed !== debouncedQ) { setDebouncedQ(trimmed); setPage(1); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, debouncedQ]);

  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return; }
    const p = new URLSearchParams();
    if (debouncedQ) p.set("q", debouncedQ);
    if (statusFilter) p.set("status", statusFilter);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, statusFilter, page, router, searchParams]);

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
        body: JSON.stringify({ subject, priority }),
      });
      const body = await res.json();
      if (res.ok) {
        setTickets((prev) => [body.data, ...prev]);
        setSubject("");
        showToast("Ticket created", "success");
      } else showToast(body.message ?? "Failed", "error");
    } catch { showToast("Network error", "error"); }
    setCreating(false);
  }

  async function sendReply() {
    if (!active || !replyText.trim()) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/v1/support/tickets/${active.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyText }),
      });
      if (res.ok) {
        const body = await res.json();
        setActive(body.data ?? active);
        setReplyText("");
        refresh();
        showToast("Reply sent", "success");
      } else showToast("Failed to send reply", "error");
    } catch { showToast("Network error", "error"); }
    setReplying(false);
  }

  const filtered = useMemo(() => {
    let rows = tickets;
    if (statusFilter) rows = rows.filter((t) => t.status === statusFilter);
    if (debouncedQ) {
      const q = debouncedQ;
      rows = rows.filter((t) => t.subject.toLowerCase().includes(q) || t.status.toLowerCase().includes(q) || t.priority.toLowerCase().includes(q));
    }
    return rows;
  }, [tickets, debouncedQ, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const columns: Column<Ticket>[] = [
    { key: "subject", header: "Subject", render: (t) => <span className="clickable" style={{ fontWeight: 500, cursor: "pointer" }} onClick={() => openTicket(t.id)}>{t.subject}</span> },
    { key: "status", header: "Status", render: (t) => <span className={`badge ${STATUS_COLORS[t.status] ?? ""}`}>{t.status}</span> },
    { key: "priority", header: "Priority", render: (t) => <span className={`badge ${PRIORITY_COLORS[t.priority] ?? ""}`}>{t.priority}</span> },
    { key: "created_at", header: "Opened", render: (t) => <span className="text-mono-sm">{new Date(t.created_at).toLocaleDateString()}</span> },
    { key: "actions", header: "", render: (t) => <button className="btn btn-sm btn-secondary" onClick={() => openTicket(t.id)}>Open</button> },
  ];

  if (loading) return <div className="dashboard-page"><div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / SUPPORT</p>
          <h1>Support</h1>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search tickets..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ maxWidth: 180 }} />
          <select className="input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ maxWidth: 130 }}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
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

      <div className="split" style={{ gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" } as React.CSSProperties}>
        <div className="card" style={{ flex: 1, minWidth: 320, overflowX: "auto" }}>
          <h2>My Tickets ({filtered.length})</h2>
          {filtered.length === 0 ? (
            <div className="empty-state"><p>{tickets.length === 0 ? "No tickets yet. Create one above and our team will respond." : `No tickets match "${debouncedQ}".`}</p></div>
          ) : (
            <DataTable
              columns={columns}
              data={paginated}
              emptyMessage="No tickets"
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              onPageChange={setPage}
              sortBy="created_at"
              order="desc"
              onSort={() => {}}
            />
          )}
        </div>
        {active && (
          <div className="card" style={{ flex: 1, minWidth: 320 }}>
            <h2>{active.subject}</h2>
            <p className="text-mono-sm" style={{ color: "var(--muted)", fontSize: 11 }}>{active.status} · {active.priority} · {new Date(active.created_at).toLocaleString()}</p>
            <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: 8 }}>
              {(active.replies ?? []).map((r) => (
                <div key={r.id} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }}>
                  <p style={{ fontSize: 12 }}>{r.body}</p>
                  <small className="text-mono-sm" style={{ fontSize: 10, color: "var(--muted)" }}>{new Date(r.created_at).toLocaleString()}</small>
                </div>
              ))}
              {(active.replies ?? []).length === 0 && <p className="text-muted" style={{ fontSize: 11 }}>No replies yet.</p>}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: "var(--space-4)" }}>
              <input className="input" placeholder="Write a reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-primary btn-sm" onClick={sendReply} disabled={replying || !replyText.trim()}>{replying ? "..." : "Reply"}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setActive(null)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <SupportInner />
    </Suspense>
  );
}
