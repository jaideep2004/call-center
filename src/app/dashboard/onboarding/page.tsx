"use client";
import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
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

const PAGE_SIZE = 10;

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialDate = searchParams.get("date") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const hasMounted = useRef(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [sRes, bRes] = await Promise.all([fetch("/api/v1/onboarding/slots?active=true"), fetch("/api/v1/onboarding/bookings")]);
    if (sRes.ok) setSlots((await sRes.json()).data ?? []);
    if (bRes.ok) setBookings((await bRes.json()).data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

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
    if (selectedDate) p.set("date", selectedDate);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, selectedDate, page, router, searchParams]);

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
    try {
      const res = await fetch(`/api/v1/onboarding/bookings/${id}`, { method: "DELETE" });
      if (res.ok) { showToast("Booking cancelled", "success"); fetchAll(); }
      else showToast("Failed to cancel", "error");
    } catch { showToast("Network error", "error"); }
  }

  const dates = useMemo(() => [...new Set(slots.map((s) => s.date))].sort(), [slots]);

  const filtered = useMemo(() => {
    let rows = slots;
    if (selectedDate) rows = rows.filter((s) => s.date === selectedDate);
    if (debouncedQ) {
      const q = debouncedQ;
      rows = rows.filter((s) => s.date.toLowerCase().includes(q) || s.start_time.includes(q) || s.end_time.includes(q));
    }
    return rows;
  }, [slots, selectedDate, debouncedQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const slotColumns: Column<Slot>[] = [
    { key: "date", header: "Date", render: (s) => <span className="text-mono-sm" style={{ fontWeight: 500 }}>{s.date}</span> },
    { key: "start_time", header: "Start", render: (s) => <span className="badge badge-info">{s.start_time.slice(0, 5)}</span> },
    { key: "end_time", header: "End", render: (s) => <span className="text-mono-sm">{s.end_time.slice(0, 5)}</span> },
    { key: "capacity", header: "Capacity", render: (s) => <span className={`badge ${s.booked_count >= s.capacity ? "badge-danger" : "badge-success"}`}>{s.booked_count}/{s.capacity}</span> },
    { key: "is_active", header: "Status", render: (s) => <span className={`badge ${s.is_active ? "badge-success" : ""}`}>{s.is_active ? "active" : "inactive"}</span> },
    { key: "actions", header: "", render: (s) => (
      <button className="btn btn-primary btn-sm" disabled={bookingSlot === s.id || s.booked_count >= s.capacity} onClick={() => handleBook(s.id)}>
        {bookingSlot === s.id ? "..." : s.booked_count >= s.capacity ? "Full" : "Book"}
      </button>
    )},
  ];

  if (loading) return <div className="dashboard-page"><div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ONBOARDING</p>
          <h1>Book your onboarding call</h1>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, maxWidth: 640 }}>After signup, pick an available slot below. Your onboarding call with the Coverage Calls team will be confirmed by admin — you&apos;ll get a confirmation and a reminder 1h before. <span style={{ color: "var(--accent)" }}>Slots are configured in Admin → Calendar.</span></p>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search slot..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ maxWidth: 160 }} />
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
        <div className="card" style={{ padding: 24, textAlign: "center", marginTop: 16 }}><p className="text-muted">{slots.length === 0 ? "No slots available yet. Check back soon — admin adds new weekly slots in Calendar." : `No slots match "${debouncedQ}".`}</p></div>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <DataTable
            columns={slotColumns}
            data={paginated}
            emptyMessage="No slots"
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            onPageChange={setPage}
            sortBy="date"
            order="asc"
            onSort={() => {}}
          />
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <OnboardingInner />
    </Suspense>
  );
}
