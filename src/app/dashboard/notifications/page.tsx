"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";
import { useSocket } from "@/lib/use-socket";

interface Notification {
  id: string;
  topic: string;
  payload: Record<string, unknown>;
  occurred_at: string;
  dispatched_at: string | null;
}
const PAGE_SIZE = 10;
const TOPIC_COLORS: Record<string, string> = {
  "call.new": "badge-info",
  "call.ended": "badge-success",
  "lead.assigned": "badge-warning",
  "support.new": "badge-warning",
  default: "",
};

function NotificationsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const hasMounted = useRef(false);

  useEffect(() => {
    fetch("/api/v1/me").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setMembershipId(body.data.membership?.id ?? null);
      }
    }).catch(() => {});
  }, []);

  const { socket } = useSocket(membershipId);

  const refresh = () => {
    fetch("/api/v1/notifications").then(async (res) => {
      if (res.ok) { const b = await res.json(); setNotifications(b.data ?? []); }
      setLoading(false);
    });
  };

  useEffect(refresh, []);

  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      refresh();
      showToast("New notification", "info");
    };
    socket.on("notification:new", handler);
    return () => { socket.off("notification:new", handler); };
  }, [socket]);

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
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, page, router, searchParams]);

  async function markRead(id: string) {
    const res = await fetch(`/api/v1/notifications/${id}`, { method: "PATCH" });
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, dispatched_at: new Date().toISOString() } : n));
      showToast("Notification marked as read", "success");
    }
  }

  async function markAllRead() {
    try {
      const res = await fetch("/api/v1/notifications/mark-all-read", { method: "POST" });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, dispatched_at: new Date().toISOString() })));
        showToast("All notifications marked as read", "success");
      }
    } catch {}
  }

  const filtered = useMemo(() => {
    if (!debouncedQ) return notifications;
    const q = debouncedQ;
    return notifications.filter((n) => n.topic.toLowerCase().includes(q) || JSON.stringify(n.payload).toLowerCase().includes(q));
  }, [notifications, debouncedQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
  const unread = filtered.filter((n) => !n.dispatched_at).length;

  const columns: Column<Notification>[] = [
    { key: "topic", header: "Topic", render: (n) => <span className={`badge ${TOPIC_COLORS[n.topic] ?? TOPIC_COLORS.default}`}>{n.topic}</span> },
    { key: "payload", header: "Payload", render: (n) => <span className="text-mono-sm" style={{ fontSize: 11, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", display: "inline-block", whiteSpace: "nowrap" }} title={JSON.stringify(n.payload)}>{JSON.stringify(n.payload)}</span> },
    { key: "occurred_at", header: "When", render: (n) => <time className="text-mono-sm" style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{new Date(n.occurred_at).toLocaleString()}</time> },
    { key: "dispatched_at", header: "Status", render: (n) => !n.dispatched_at ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--cyan)", display: "inline-block" }} title="Unread" /> : <span className="badge">read</span> },
    { key: "actions", header: "", className: "actions-cell", render: (n) => !n.dispatched_at ? <button className="btn btn-sm btn-secondary" style={{ whiteSpace: "nowrap" }} onClick={() => markRead(n.id)}>Mark read</button> : null },
  ];

  if (loading) return <div className="dashboard-page"><div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> NOTIFICATIONS</p>
          <h1>Notifications</h1>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search topic or payload..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ minWidth: 200 }} />
          <span className="text-mono-sm" style={{ whiteSpace: "nowrap" }}>{unread} unread · {filtered.length} total</span>
          {unread > 0 && <button className="btn btn-secondary btn-sm" style={{ whiteSpace: "nowrap" }} onClick={markAllRead}>Mark all read</button>}
        </div>
      </div>
      {notifications.length === 0 ? (
        <div className="empty-state"><p>No notifications yet. You&apos;ll see calls, leads and system alerts here.</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>No notifications match &quot;{debouncedQ}&quot;.</p></div>
      ) : (
        <DataTable
            columns={columns}
            data={paginated}
            emptyMessage="No notifications"
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            onPageChange={setPage}
            sortBy="occurred_at"
            order="desc"
            onSort={() => {}}
          />
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <NotificationsInner />
    </Suspense>
  );
}
