"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { showToast } from "@/lib/use-toast";

/**
 * Admin calendar is entries-only: agents book through the GoHighLevel widget
 * on Dashboard → Onboarding → Book Call. Here admins read the internal
 * onboarding slots + bookings history (APIs and tables stay — they hold
 * history). No booking widget lives on this page.
 */

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  is_active: boolean;
  booked_count?: number;
}

interface Booking {
  id: string;
  slot_id: string;
  agent_id: string;
  status: string;
  created_at: string;
  date?: string;
  start_time?: string;
  end_time?: string;
}

const PAGE_SIZE = 10;

export default function AdminCalendarPage() {
  const [tab, setTab] = useState<"slots" | "bookings">("slots");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/v1/onboarding/slots").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/v1/onboarding/bookings").then((r) => (r.ok ? r.json() : { data: [] })),
    ])
      .then(([sBody, bBody]) => {
        setSlots(sBody.data ?? []);
        setBookings(bBody.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        showToast("Failed to load calendar entries", "error");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const rows = useMemo(() => (tab === "slots" ? slots : bookings), [tab, slots, bookings]);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [rows, safePage],
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow">
            <i /> ADMIN / CALENDAR
          </p>
          <h1>Booking Calendar</h1>
          <p
            style={{
              fontSize: 11,
              color: "var(--muted)",
              marginTop: 6,
              maxWidth: 640,
            }}>
            Read-only entries. Agents book from <b>Dashboard → Onboarding → Book Call</b> (GoHighLevel);
            internal slots and bookings below are history.
          </p>
        </div>
        <Link href="/dashboard/onboarding" className="btn btn-ghost btn-sm">
          Agent booking view →
        </Link>
      </div>

      <nav className="tabs" style={{ marginBottom: "var(--space-4)" }}>
        <button
          type="button"
          className={`tab${tab === "slots" ? " active" : ""}`}
          onClick={() => setTab("slots")}
          aria-pressed={tab === "slots"}>
          Onboarding Slots ({slots.length})
        </button>
        <button
          type="button"
          className={`tab${tab === "bookings" ? " active" : ""}`}
          onClick={() => setTab("bookings")}
          aria-pressed={tab === "bookings"}>
          Bookings ({bookings.length})
        </button>
      </nav>

      {loading ? (
        <div className="stack" style={{ gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-text" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <p>{tab === "slots" ? "No onboarding slots yet." : "No bookings yet."}</p>
        </div>
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                {tab === "slots" ? (
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Capacity</th>
                    <th>Booked</th>
                    <th>Status</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Agent</th>
                    <th>Status</th>
                    <th>Booked At</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {tab === "slots"
                  ? (paged as Slot[]).map((s) => (
                      <tr key={s.id}>
                        <td className="text-mono-sm">{s.date}</td>
                        <td className="text-mono-sm">
                          {s.start_time} – {s.end_time}
                        </td>
                        <td className="text-mono-sm">{s.capacity}</td>
                        <td className="text-mono-sm">{s.booked_count ?? "—"}</td>
                        <td>
                          <span className={`badge${s.is_active ? " badge-success" : ""}`}>
                            {s.is_active ? "active" : "inactive"}
                          </span>
                        </td>
                      </tr>
                    ))
                  : (paged as Booking[]).map((b) => (
                      <tr key={b.id}>
                        <td className="text-mono-sm">{b.date ?? "—"}</td>
                        <td className="text-mono-sm">
                          {b.start_time ? `${b.start_time} – ${b.end_time ?? ""}` : "—"}
                        </td>
                        <td className="text-mono-sm">{b.agent_id.slice(0, 8)}…</td>
                        <td>
                          <span
                            className={`badge${
                              b.status === "confirmed"
                                ? " badge-success"
                                : b.status === "cancelled"
                                  ? " badge-danger"
                                  : " badge-warning"
                            }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="text-mono-sm">
                          {b.created_at ? new Date(b.created_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: "var(--space-4)" }}>
              <button
                className="pagination-item"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}>
                &lsaquo;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`pagination-item${p === safePage ? " active" : ""}`}
                  onClick={() => setPage(p)}>
                  {p}
                </button>
              ))}
              <button
                className="pagination-item"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}>
                &rsaquo;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
