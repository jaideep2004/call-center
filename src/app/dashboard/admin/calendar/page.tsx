"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  is_active: boolean;
  booked_count: number;
  created_at: string;
}
interface Booking { id: string; slot_id: string; agent_id: string; status: string; created_at: string; date: string; start_time: string; end_time: string; }

const PAGE_SIZE = 10;

export default function AdminCalendarPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [capacity, setCapacity] = useState("3");
  const [creating, setCreating] = useState(false);
  const [agentMap, setAgentMap] = useState<Record<string, { name: string; email: string }>>({});
  const [slotSearch, setSlotSearch] = useState("");
  const [slotDateFilter, setSlotDateFilter] = useState("");
  const [slotStatusFilter, setSlotStatusFilter] = useState<"" | "active" | "inactive">("");
  const [slotPage, setSlotPage] = useState(1);
  const [slotSortBy, setSlotSortBy] = useState("date");
  const [slotOrder, setSlotOrder] = useState<"asc" | "desc">("asc");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingDateFilter, setBookingDateFilter] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<"" | "pending" | "confirmed" | "cancelled">("");
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingSortBy, setBookingSortBy] = useState("date");
  const [bookingOrder, setBookingOrder] = useState<"asc" | "desc">("desc");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [sRes, bRes, aRes] = await Promise.all([fetch("/api/v1/onboarding/slots"), fetch("/api/v1/onboarding/bookings"), fetch("/api/v1/agents?limit=200")]);
    if (sRes.ok) setSlots((await sRes.json()).data ?? []);
    if (bRes.ok) setBookings((await bRes.json()).data ?? []);
    if (aRes.ok) {
      const body = await aRes.json();
      const rows = body.data ?? [];
      const map: Record<string, { name: string; email: string }> = {};
      for (const ag of rows as any[]) {
        map[ag.id] = { name: ag.user_name ?? ag.membership_id?.slice(0, 8) ?? ag.id.slice(0, 8), email: ag.user_email ?? "" };
      }
      setAgentMap(map);
    }
    setLoading(false);
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleCreate() {
    if (!date) { showToast("Pick a date", "error"); return; }
    if (start >= end) { showToast("End must be after start", "error"); return; }
    const cap = Number(capacity);
    if (!Number.isFinite(cap) || cap < 1 || cap > 100) { showToast("Capacity 1..100", "error"); return; }
    if (date < new Date().toISOString().slice(0, 10)) { showToast("Date cannot be in the past", "error"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/v1/onboarding/slots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, start_time: start, end_time: end, capacity: cap }) });
      const b = await res.json().catch(() => ({}));
      if (res.ok) { showToast("Slot created", "success"); setDate(""); fetchAll(); }
      else showToast(b.message ?? "Failed to create", "error");
    } catch { showToast("Network error", "error"); }
    setCreating(false);
  }
  async function toggleActive(s: Slot) {
    const res = await fetch(`/api/v1/onboarding/slots/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !s.is_active }) });
    if (res.ok) fetchAll(); else showToast("Failed", "error");
  }
  async function removeSlot(id: string) {
    if (!confirm("Delete slot?")) return;
    const res = await fetch(`/api/v1/onboarding/slots/${id}`, { method: "DELETE" });
    const b = await res.json().catch(() => ({}));
    if (res.ok) { showToast("Deleted", "success"); fetchAll(); } else showToast(b.message ?? "Failed", "error");
  }
  async function setBookingStatus(id: string, status: string) {
    const res = await fetch(`/api/v1/onboarding/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (res.ok) { showToast(`Booking ${status}`, "success"); fetchAll(); } else showToast("Failed", "error");
  }

  // Slots filtered
  const filteredSlots = useMemo(() => {
    let out = [...slots];
    if (slotDateFilter) out = out.filter((s) => s.date === slotDateFilter);
    if (slotStatusFilter === "active") out = out.filter((s) => s.is_active);
    if (slotStatusFilter === "inactive") out = out.filter((s) => !s.is_active);
    if (slotSearch.trim()) {
      const q = slotSearch.trim().toLowerCase();
      out = out.filter((s) => s.date.includes(q) || s.start_time.includes(q) || s.end_time.includes(q) || String(s.capacity).includes(q));
    }
    out.sort((a, b) => {
      let cmp = 0;
      if (slotSortBy === "date") cmp = a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time);
      else if (slotSortBy === "capacity") cmp = a.capacity - b.capacity;
      else if (slotSortBy === "booked_count") cmp = a.booked_count - b.booked_count;
      else if (slotSortBy === "is_active") cmp = Number(a.is_active) - Number(b.is_active);
      return slotOrder === "asc" ? cmp : -cmp;
    });
    return out;
  }, [slots, slotDateFilter, slotStatusFilter, slotSearch, slotSortBy, slotOrder]);

  const slotTotalPages = Math.max(1, Math.ceil(filteredSlots.length / PAGE_SIZE));
  const slotsPaged = useMemo(() => {
    const startIdx = (slotPage - 1) * PAGE_SIZE;
    return filteredSlots.slice(startIdx, startIdx + PAGE_SIZE);
  }, [filteredSlots, slotPage]);

  useEffect(() => { setSlotPage(1); }, [slotSearch, slotDateFilter, slotStatusFilter]);
  useEffect(() => { if (slotPage > slotTotalPages) setSlotPage(slotTotalPages); }, [slotTotalPages, slotPage]);

  // Bookings filtered
  const filteredBookings = useMemo(() => {
    let out = [...bookings];
    if (bookingDateFilter) out = out.filter((b) => b.date === bookingDateFilter);
    if (bookingStatusFilter) out = out.filter((b) => b.status === bookingStatusFilter);
    if (bookingSearch.trim()) {
      const q = bookingSearch.trim().toLowerCase();
      out = out.filter((b) => {
        const ag = agentMap[b.agent_id];
        return (
          b.date.includes(q) ||
          b.status.toLowerCase().includes(q) ||
          b.agent_id.toLowerCase().includes(q) ||
          (ag?.name ?? "").toLowerCase().includes(q) ||
          (ag?.email ?? "").toLowerCase().includes(q)
        );
      });
    }
    out.sort((a, b) => {
      let cmp = 0;
      if (bookingSortBy === "date") cmp = a.date.localeCompare(b.date) || (a.start_time ?? "").localeCompare(b.start_time ?? "");
      else if (bookingSortBy === "status") cmp = a.status.localeCompare(b.status);
      else if (bookingSortBy === "agent") {
        const an = agentMap[a.agent_id]?.name ?? a.agent_id;
        const bn = agentMap[b.agent_id]?.name ?? b.agent_id;
        cmp = an.localeCompare(bn);
      } else if (bookingSortBy === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return bookingOrder === "asc" ? cmp : -cmp;
    });
    return out;
  }, [bookings, bookingDateFilter, bookingStatusFilter, bookingSearch, agentMap, bookingSortBy, bookingOrder]);

  const bookingTotalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const bookingsPaged = useMemo(() => {
    const startIdx = (bookingPage - 1) * PAGE_SIZE;
    return filteredBookings.slice(startIdx, startIdx + PAGE_SIZE);
  }, [filteredBookings, bookingPage]);

  useEffect(() => { setBookingPage(1); }, [bookingSearch, bookingDateFilter, bookingStatusFilter]);
  useEffect(() => { if (bookingPage > bookingTotalPages) setBookingPage(bookingTotalPages); }, [bookingTotalPages, bookingPage]);

  function handleSlotSort(f: string) { if (slotSortBy === f) setSlotOrder((o) => o === "asc" ? "desc" : "asc"); else { setSlotSortBy(f); setSlotOrder("asc"); } }
  function handleBookingSort(f: string) { if (bookingSortBy === f) setBookingOrder((o) => o === "asc" ? "desc" : "asc"); else { setBookingSortBy(f); setBookingOrder("asc"); } }

  const slotColumns: Column<Slot>[] = [
    { key: "date", header: "Date", sortable: true, render: (s) => <span className="text-mono-sm">{s.date}</span> },
    { key: "time", header: "Time", render: (s) => <span className="text-mono-sm">{s.start_time.slice(0,5)} — {s.end_time.slice(0,5)}</span> },
    { key: "capacity", header: "Capacity", sortable: true, render: (s) => <span>{s.capacity}</span> },
    { key: "booked_count", header: "Booked", sortable: true, render: (s) => <span className={`badge ${s.booked_count >= s.capacity ? "badge-danger" : "badge-info"}`}>{s.booked_count}/{s.capacity}</span> },
    { key: "is_active", header: "Status", sortable: true, render: (s) => <span className={`badge ${s.is_active ? "badge-success" : ""}`}>{s.is_active ? "Active" : "Inactive"}</span> },
    {
      key: "actions", header: "", className: "actions-cell",
      render: (s) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button className="btn btn-sm btn-ghost" onClick={() => toggleActive(s)}>{s.is_active ? "Deactivate" : "Activate"}</button>
          <button className="btn btn-sm btn-danger" onClick={() => removeSlot(s.id)}>Delete</button>
        </div>
      ),
    },
  ];

  const bookingColumns: Column<Booking>[] = [
    { key: "date", header: "Date", sortable: true, render: (b) => <span className="text-mono-sm">{b.date}</span> },
    { key: "time", header: "Time", render: (b) => <span className="text-mono-sm">{b.start_time?.slice(0,5) ?? "—"} — {b.end_time?.slice(0,5) ?? "—"}</span> },
    {
      key: "agent", header: "Agent", sortable: true,
      render: (b) => {
        const ag = agentMap[b.agent_id];
        if (ag?.name) return (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 500 }}>{ag.name}</span>
            {ag.email && <span className="text-mono-sm" style={{ fontSize: 11, color: "var(--muted)" }}>{ag.email}</span>}
          </div>
        );
        return <span className="text-mono-sm" title={b.agent_id}>{b.agent_id.slice(0, 8)}…</span>;
      },
    },
    { key: "status", header: "Status", sortable: true, render: (b) => <span className={`badge ${b.status === "confirmed" ? "badge-success" : b.status === "cancelled" ? "badge-danger" : "badge-warning"}`}>{b.status}</span> },
    {
      key: "actions", header: "Actions", className: "actions-cell",
      render: (b) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "nowrap" }}>
          {b.status === "pending" && <><button className="btn btn-sm btn-success" onClick={() => setBookingStatus(b.id, "confirmed")}>Confirm</button><button className="btn btn-sm btn-danger" onClick={() => setBookingStatus(b.id, "cancelled")}>Cancel</button></>}
          {b.status === "confirmed" && <button className="btn btn-sm btn-ghost" onClick={() => setBookingStatus(b.id, "cancelled")}>Cancel</button>}
          {b.status === "cancelled" && <button className="btn btn-sm btn-ghost" onClick={() => setBookingStatus(b.id, "pending")}>Reopen</button>}
        </div>
      ),
    },
  ];

  if (loading) return <div className="dashboard-page"><div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / CALENDAR</p>
          <h1>Onboarding Calendar</h1>
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, maxWidth: 640 }}>Configure available dates/times for post-signup onboarding calls. Agents see these in <b>Dashboard → Onboarding → Book Call</b>.</p>
        </div>
      </div>

      <div className="card" style={{ padding: "var(--space-5)", display: "flex", gap: "var(--space-4)", flexWrap: "wrap", alignItems: "end" }}>
        <div style={{ flex: 1, minWidth: 140 }}><label className="form-label">Date</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className="form-label">Start</label><input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><label className="form-label">End</label><input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        <div style={{ minWidth: 90 }}><label className="form-label">Capacity</label><input className="input" type="number" min={1} max={100} value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
        <button className="btn btn-primary" disabled={creating} onClick={handleCreate}>{creating ? "Creating..." : "+ Add Slot"}</button>
      </div>

      <div className="card card--table" style={{ marginTop: "var(--space-5)" }}>
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 className="card-title">Slots ({filteredSlots.length} of {slots.length})</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input className="input" type="search" placeholder="Search…" value={slotSearch} onChange={(e) => setSlotSearch(e.target.value)} style={{ maxWidth: 160, fontSize: 12 }} />
            <input className="input" type="date" value={slotDateFilter} onChange={(e) => setSlotDateFilter(e.target.value)} style={{ maxWidth: 160, fontSize: 12 }} />
            <select className="input" value={slotStatusFilter} onChange={(e) => setSlotStatusFilter(e.target.value as any)} style={{ maxWidth: 140, fontSize: 12 }}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {(slotSearch || slotDateFilter || slotStatusFilter) && <button className="btn btn-sm btn-ghost" onClick={() => { setSlotSearch(""); setSlotDateFilter(""); setSlotStatusFilter(""); }}>Clear</button>}
          </div>
        </div>
        {slots.length === 0 ? (
          <div style={{ padding: "var(--space-8) 16px", textAlign: "center" }}>
            <p style={{ font: "500 15px var(--serif)", margin: "0 0 6px" }}>No weekly slots yet</p>
            <p className="text-muted" style={{ fontSize: 12, margin: "0 0 14px", maxWidth: 520, marginInline: "auto" }}>Create your first onboarding slot above (date + start/end + capacity). Agents see active slots in <strong>Book Call → Onboarding</strong> and get a confirmation + 1h reminder. Empty state is correct — not a bug.</p>
            <p className="text-mono-sm" style={{ fontSize: 10, color: "var(--muted)" }}>Tip: Add 2–3 weekly slots with capacity 3–5 each; use “Active” toggle to hide without deleting.</p>
          </div>
        ) : filteredSlots.length === 0 ? <p className="text-muted" style={{ padding: 16 }}>No slots match filters.</p> : (
            <DataTable
              columns={slotColumns}
              data={slotsPaged}
              loading={false}
              emptyMessage="No slots found."
              page={slotPage}
              totalPages={slotTotalPages}
              total={filteredSlots.length}
              onPageChange={setSlotPage}
              sortBy={slotSortBy}
              order={slotOrder}
              onSort={handleSlotSort}
            />
        )}
      </div>

      <div className="card card--table" style={{ marginTop: "var(--space-5)" }}>
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 className="card-title">Bookings ({filteredBookings.length} of {bookings.length})</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input className="input" type="search" placeholder="Search agent, status…" value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} style={{ maxWidth: 180, fontSize: 12 }} />
            <input className="input" type="date" value={bookingDateFilter} onChange={(e) => setBookingDateFilter(e.target.value)} style={{ maxWidth: 160, fontSize: 12 }} />
            <select className="input" value={bookingStatusFilter} onChange={(e) => setBookingStatusFilter(e.target.value as any)} style={{ maxWidth: 150, fontSize: 12 }}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {(bookingSearch || bookingDateFilter || bookingStatusFilter) && <button className="btn btn-sm btn-ghost" onClick={() => { setBookingSearch(""); setBookingDateFilter(""); setBookingStatusFilter(""); }}>Clear</button>}
          </div>
        </div>
        {bookings.length === 0 ? <p className="text-muted" style={{ padding: 16 }}>No bookings yet.</p> : filteredBookings.length === 0 ? <p className="text-muted" style={{ padding: 16 }}>No bookings match filters.</p> : (
            <DataTable
              columns={bookingColumns}
              data={bookingsPaged}
              loading={false}
              emptyMessage="No bookings found."
              page={bookingPage}
              totalPages={bookingTotalPages}
              total={filteredBookings.length}
              onPageChange={setBookingPage}
              sortBy={bookingSortBy}
              order={bookingOrder}
              onSort={handleBookingSort}
            />
        )}
      </div>
    </div>
  );
}
