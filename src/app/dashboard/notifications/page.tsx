"use client";

import { useState, useEffect } from "react";
import { showToast } from "@/lib/use-toast";
import { useSocket } from "@/lib/use-socket";

interface Notification {
  id: string;
  topic: string;
  payload: Record<string, unknown>;
  occurred_at: string;
  dispatched_at: string | null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [membershipId, setMembershipId] = useState<string | null>(null);

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
      if (res.ok) { const b = await res.json(); setNotifications(b.data); }
      setLoading(false);
    });
  };

  useEffect(refresh, []);

  // Live updates: the gateway pushes notification:new to the agent's socket
  // room the moment a notification row is created.
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      refresh();
      showToast("New notification", "info");
    };
    socket.on("notification:new", handler);
    return () => { socket.off("notification:new", handler); };
  }, [socket]);

  async function markRead(id: string) {
    const res = await fetch(`/api/v1/notifications/${id}`, { method: "PATCH" });
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, dispatched_at: new Date().toISOString() } : n));
      showToast("Notification marked as read", "success");
    }
  }

  async function markAllRead() {
    for (const n of notifications.filter((n) => !n.dispatched_at)) {
      await fetch(`/api/v1/notifications/${n.id}`, { method: "PATCH" });
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, dispatched_at: n.dispatched_at ?? new Date().toISOString() })));
    showToast("All notifications marked as read", "success");
  }

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  const unread = notifications.filter((n) => !n.dispatched_at).length;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> NOTIFICATIONS</p>
          <h1>Notifications</h1>
        </div>
        <div className="split" style={{ gap: 8, alignItems: "center" } as React.CSSProperties}>
          <span className="text-mono-sm">{unread} unread</span>
          {unread > 0 && <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={markAllRead}>Mark all read</button>}
        </div>
      </div>
      {notifications.length === 0 ? (
        <div className="empty-state"><p>No notifications yet.</p></div>
      ) : (
        <div className="stack" style={{ gap: 4 }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              className="card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "var(--space-3) var(--space-4)",
                opacity: n.dispatched_at ? 0.5 : 1,
                cursor: n.dispatched_at ? "default" : "pointer",
              }}
              onClick={() => !n.dispatched_at && markRead(n.id)}
            >
              <div>
                <span className="badge" style={{ marginRight: "var(--space-2)" }}>{n.topic}</span>
                <span className="text-mono-sm" style={{ fontSize: 12 }}>{JSON.stringify(n.payload)}</span>
              </div>
              <div className="split" style={{ gap: 8, alignItems: "center" } as React.CSSProperties}>
                <time className="text-mono-sm" style={{ fontSize: 10, color: "var(--muted)" }}>
                  {new Date(n.occurred_at).toLocaleString()}
                </time>
                {!n.dispatched_at && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--cyan)" }} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
