"use client";
import { useState, useEffect, useCallback } from "react";
import { showToast } from "@/lib/use-toast";

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  is_active: boolean;
}
interface Booking { id: string; slot_id: string; status: string; date: string; start_time: string; end_time: string; created_at: string; }

export default function OnboardingPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [sRes, bRes] = await Promise.all([fetch("/api/v1/onboarding/slots?active=true"), fetch("/api/v1/onboarding/bookings")]);
    if (sRes.ok) setSlots((await sRes.json()).data ?? []);
    if (bRes.ok) setBookings((await bRes.json()).data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleBook(slotId: string) {
    setBookingSlot(slotId);
    try {
      const res = await fetch("/api/v1/onboarding/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot_id: slotId }) });
      const b = await res.json().catch(() => ({}));
      if (res.ok) { showToast("Booked — admin will confirm shortly. Check your email.", "success"); fetchAll(); }
      else showToast(b.message ?? "Failed to book", "error");
    } catch { showToast("Network error", "error"); }
    setBookingSlot(null);
  }
  async function cancelBooking(id: string) {
    if (!confirm("Cancel this booking?")) return;
    const res = await fetch(`/api/v1/onboarding/bookings/${id}`, { method: "DELETE" });
    if (res.ok) { showToast("Booking cancelled", "success"); fetchAll(); } else showToast("Failed", "error");
  }

  const dates = Array.from(new Set(slots.map((s) => s.date))).sort();
  const filtered = selectedDate ? slots.filter((s) => s.date === selectedDate) : slots;

  if (loading) return <div className="dashboard-page"><div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ONBOARDING</p>
          <h1>Book your onboarding call</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, maxWidth: 640 }}>After signup, pick an available slot below. Your onboarding call with the Coverage Calls team will be confirmed by admin — you’ll get a confirmation and a reminder 1h before. <span style={{ color: "var(--accent)" }}>Slots are configured in Admin → Calendar.</span></p>
        </div>
      </div>

      {bookings.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ font: "600 13px var(--mono)", margin: 0 }}>Your bookings</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {bookings.map((b) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(168,85,247,0.06)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{b.date} · {b.start_time.slice(0,5)} — {b.end_time.slice(0,5)}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 2 }}>Status: <span className={`badge ${b.status === "confirmed" ? "badge-success" : b.status === "cancelled" ? "badge-danger" : "badge-warning"}`}>{b.status}</span> · booked {new Date(b.created_at).toLocaleString()}</div>
                </div>
                {b.status !== "cancelled" && <button className="btn btn-sm btn-ghost" onClick={() => cancelBooking(b.id)}>Cancel</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label className="form-label" style={{ margin: 0 }}>Filter by date</label>
          <select className="input" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">All dates ({slots.length} slots)</option>
            {dates.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <span className="text-muted" style={{ fontSize: 11 }}>{filtered.length} slot(s) available</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 24, textAlign: "center", marginTop: 16 }}>
          <p className="text-muted">No available slots for this date. Try another date or check back — admin adds slots in <b>Admin → Calendar</b>.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12, marginTop: 16 }}>
          {filtered.map((s) => {
            const full = s.booked_count >= s.capacity;
            const alreadyBooked = bookings.some((b) => b.slot_id === s.id && b.status !== "cancelled");
            return (
              <div key={s.id} className="card" style={{ padding: 16, borderColor: full ? "rgba(239,68,68,0.3)" : undefined, opacity: full ? 0.7 : 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.date}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 16, color: "var(--accent)", marginTop: 4 }}>{s.start_time.slice(0,5)} — {s.end_time.slice(0,5)}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
                  <span className={`badge ${full ? "badge-danger" : "badge-success"}`}>{s.booked_count}/{s.capacity} booked</span>
                  {full && <span style={{ fontSize: 10, color: "var(--muted)" }}>Full</span>}
                </div>
                <button className={`btn ${full || alreadyBooked ? "btn-ghost" : "btn-primary"} btn-sm`} disabled={full || alreadyBooked || bookingSlot === s.id} onClick={() => handleBook(s.id)} style={{ marginTop: 12, width: "100%" }}>
                  {alreadyBooked ? "Already booked" : full ? "Fully booked" : bookingSlot === s.id ? "Booking..." : "Book this slot"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
