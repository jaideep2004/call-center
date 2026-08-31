"use client";
import { useState, useEffect, useCallback } from "react";
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

export default function AdminCalendarPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [capacity, setCapacity] = useState("3");
  const [creating, setCreating] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [sRes, bRes] = await Promise.all([fetch("/api/v1/onboarding/slots"), fetch("/api/v1/onboarding/bookings")]);
    if (sRes.ok) setSlots((await sRes.json()).data ?? []);
    if (bRes.ok) setBookings((await bRes.json()).data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleCreate() {
    if (!date) { showToast("Pick a date", "error"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/v1/onboarding/slots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, start_time: start, end_time: end, capacity: Number(capacity) }) });
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

  if (loading) return <div className="dashboard-page"><div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / CALENDAR</p>
          <h1>Onboarding Calendar</h1>
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Configure available dates/times for post-signup onboarding calls. Agents see these in <b>Dashboard → Onboarding → Book Call</b>.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <div style={{ flex: 1, minWidth: 140 }}><label className="form-label">Date</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className="form-label">Start</label><input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><label className="form-label">End</label><input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        <div style={{ minWidth: 90 }}><label className="form-label">Capacity</label><input className="input" type="number" min={1} max={100} value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
        <button className="btn btn-primary" disabled={creating} onClick={handleCreate}>{creating ? "Creating..." : "+ Add Slot"}</button>
      </div>

      <div className="card" style={{ marginTop: 16, padding: 0, overflow: "hidden" }}>
        <div className="card-header"><h2 className="card-title">Slots ({slots.length})</h2></div>
        {slots.length === 0 ? <p className="text-muted" style={{ padding: 16 }}>No slots yet — add one above.</p> : (
          <table className="data-table"><thead><tr><th>Date</th><th>Time</th><th>Capacity</th><th>Booked</th><th>Status</th><th></th></tr></thead>
            <tbody>{slots.map((s) => (
              <tr key={s.id}>
                <td className="text-mono-sm">{s.date}</td>
                <td className="text-mono-sm">{s.start_time.slice(0,5)} — {s.end_time.slice(0,5)}</td>
                <td>{s.capacity}</td><td><span className={`badge ${s.booked_count >= s.capacity ? "badge-danger" : "badge-info"}`}>{s.booked_count}/{s.capacity}</span></td>
                <td><span className={`badge ${s.is_active ? "badge-success" : ""}`}>{s.is_active ? "Active" : "Inactive"}</span></td>
                <td style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => toggleActive(s)}>{s.is_active ? "Deactivate" : "Activate"}</button>
                  <button className="btn btn-sm btn-danger" onClick={() => removeSlot(s.id)}>Delete</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 16, padding: 0, overflow: "hidden" }}>
        <div className="card-header"><h2 className="card-title">Bookings ({bookings.length})</h2></div>
        {bookings.length === 0 ? <p className="text-muted" style={{ padding: 16 }}>No bookings yet.</p> : (
          <table className="data-table"><thead><tr><th>Date</th><th>Time</th><th>Agent</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{bookings.map((b) => (
              <tr key={b.id}>
                <td className="text-mono-sm">{b.date}</td>
                <td className="text-mono-sm">{b.start_time?.slice(0,5)} — {b.end_time?.slice(0,5)}</td>
                <td className="text-mono-sm">{b.agent_id.slice(0, 8)}</td>
                <td><span className={`badge ${b.status === "confirmed" ? "badge-success" : b.status === "cancelled" ? "badge-danger" : "badge-warning"}`}>{b.status}</span></td>
                <td style={{ display: "flex", gap: 6 }}>
                  {b.status === "pending" && <><button className="btn btn-sm btn-success" onClick={() => setBookingStatus(b.id, "confirmed")}>Confirm</button><button className="btn btn-sm btn-danger" onClick={() => setBookingStatus(b.id, "cancelled")}>Cancel</button></>}
                  {b.status === "confirmed" && <button className="btn btn-sm btn-ghost" onClick={() => setBookingStatus(b.id, "cancelled")}>Cancel</button>}
                  {b.status === "cancelled" && <button className="btn btn-sm btn-ghost" onClick={() => setBookingStatus(b.id, "pending")}>Reopen</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
