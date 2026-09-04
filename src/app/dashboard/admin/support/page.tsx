"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";

interface Reply {
  id: string;
  body: string;
  author_membership_id: string;
  created_at: string;
}
interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  requester_membership_id: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "badge-warning",
  in_progress: "badge-info",
  resolved: "badge-success",
  closed: "",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "badge",
  normal: "badge-info",
  high: "badge-warning",
  urgent: "badge-danger",
};

const PAGE_SIZE = 10;

function AdminSupportInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStatus = searchParams.get("status") ?? "";
  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<(Ticket & { replies?: Reply[] }) | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const hasMounted = useRef(false);

  const refresh = useCallback(() => {
    fetch(`/api/v1/support/tickets${statusFilter ? `?status=${statusFilter}` : ""}`)
      .then(async (res) => {
        if (res.ok) {
          const body = await res.json();
          setTickets(body.data ?? []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statusFilter]);

  useEffect(refresh, [refresh]);

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== debouncedQ) {
        setDebouncedQ(trimmed);
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, debouncedQ]);

  // URL sync ?q=&status=&page
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (debouncedQ) params.set("q", debouncedQ);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [statusFilter, debouncedQ, page, router, searchParams]);

  async function openTicket(id: string) {
    const res = await fetch(`/api/v1/support/tickets/${id}`);
    if (res.ok) {
      const body = await res.json();
      setActive(body.data);
      setReplyText("");
    }
  }

  async function setStatus(id: string, status: string) {
    if (!confirm(`Change ticket status to "${status}"?`)) return;
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
        if (active && active.id === id) {
          // Update active ticket status optimistically
          setActive((prev) => (prev ? { ...prev, status } : prev));
        }
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

  const filtered = useMemo(() => {
    if (!debouncedQ) return tickets;
    const q = debouncedQ.toLowerCase();
    return tickets.filter((t) => t.subject.toLowerCase().includes(q) || t.status.toLowerCase().includes(q) || t.priority.toLowerCase().includes(q));
  }, [tickets, debouncedQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const columns: Column<Ticket>[] = [
    {
      key: "subject",
      header: "Subject",
      render: (t) => (
        <span className="clickable" onClick={() => openTicket(t.id)} style={{ fontWeight: 500, cursor: "pointer" }} title={t.subject}>
          {t.subject}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (t) => <span className={`badge ${STATUS_COLORS[t.status] ?? ""}`}>{t.status}</span>,
    },
    {
      key: "priority",
      header: "Priority",
      render: (t) => <span className={`badge ${PRIORITY_COLORS[t.priority] ?? ""}`}>{t.priority}</span>,
    },
    {
      key: "created_at",
      header: "Created",
      render: (t) => <span className="text-mono-sm">{new Date(t.created_at).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (t) => (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button className="btn btn-sm" onClick={() => setStatus(t.id, "in_progress")} disabled={t.status === "in_progress" || t.status === "resolved" || t.status === "closed"} title={t.status !== "open" ? "Only open tickets can be started" : undefined}>
            Start
          </button>
          <button className="btn btn-sm" onClick={() => setStatus(t.id, "resolved")} disabled={t.status === "resolved" || t.status === "closed"} title={t.status === "closed" ? "Closed tickets cannot be resolved" : undefined}>
            Resolve
          </button>
          <button className="btn btn-sm" onClick={() => setStatus(t.id, "closed")} disabled={t.status === "closed"}>
            Close
          </button>
        </div>
      ),
    },
  ];

  if (loading)
    return (
      <div className="dashboard-page">
        <div className="stack" style={{ gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-text" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow">
            <i /> ADMIN / SUPPORT
          </p>
          <h1>Support Queue</h1>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ maxWidth: 160 }}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <div style={{ position: "relative", minWidth: 200 }}>
            <input
              className="input"
              placeholder="Search subject…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search tickets"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                aria-label="Clear search"
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 16 }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="split" style={{ ["--gap" as string]: "1.5rem", display: "flex", gap: "1.5rem", flexWrap: "wrap" } as React.CSSProperties}>
        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Tickets</h2>
            <span className="text-mono-sm">
              {filtered.length} result(s){filtered.length > PAGE_SIZE ? ` — page ${safePage}/${totalPages}` : ""}
            </span>
          </div>
          {filtered.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 12, padding: "var(--space-4) 0" }}>
              {debouncedQ ? `No tickets match “${debouncedQ}”.` : "No tickets match."}
            </p>
          ) : (
            <DataTable
              columns={columns}
              data={paged}
              loading={false}
              emptyMessage={debouncedQ ? `No tickets match “${debouncedQ}”.` : "No tickets match."}
              page={safePage}
              totalPages={totalPages}
              total={filtered.length}
              onPageChange={(p) => setPage(p)}
              sortBy=""
              order="desc"
              onSort={() => {}}
            />
          )}
        </div>

        {active && (
          <div className="card" style={{ flex: 1.2, minWidth: 320, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <h2 style={{ margin: 0, flex: 1 }}>{active.subject}</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setActive(null)}
                aria-label="Close detail"
                style={{ flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <span className={`badge ${STATUS_COLORS[active.status] ?? ""}`}>{active.status}</span>
              <span className={`badge ${PRIORITY_COLORS[active.priority] ?? ""}`}>{active.priority}</span>
              <span className="text-mono-sm" style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center" }}>
                {new Date(active.created_at).toLocaleString()}
              </span>
            </div>
            <div className="stack" style={{ gap: 8, marginTop: "var(--space-3)", maxHeight: 360, overflow: "auto" }}>
              {active.replies?.length === 0 && <p className="text-muted" style={{ fontSize: 12 }}>No replies yet.</p>}
              {active.replies?.map((r) => (
                <div key={r.id} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}>
                  <p style={{ fontSize: 13, whiteSpace: "pre-wrap", margin: 0 }}>{r.body}</p>
                  <p className="text-mono-sm" style={{ fontSize: 10, marginTop: 6 }}>
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="filter-bar" style={{ marginTop: "var(--space-3)", display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                className="input"
                placeholder="Reply… (Ctrl+Enter to send)"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    sendReply();
                  }
                }}
                rows={3}
                style={{ flex: 1, resize: "vertical", minHeight: 60 }}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={sendReply} disabled={replying || !replyText.trim()} style={{ alignSelf: "flex-end", height: 36 }}>
                {replying ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminSupportPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" style={{ height: 18, width: 200 }} /></div>}>
      <AdminSupportInner />
    </Suspense>
  );
}
