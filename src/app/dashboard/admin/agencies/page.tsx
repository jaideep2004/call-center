"use client";

import { Suspense, useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { showToast } from "@/lib/use-toast";

interface Agency {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency: string;
  recording_retention_days: number;
  created_at: string;
}

const PAGE_SIZE = 10;

function AdminAgenciesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL-synced state (additive: keeps existing status filter behaviour but now synced)
  const urlStatus = searchParams.get("status") ?? "";
  const urlQ = searchParams.get("q") ?? "";
  const urlPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [searchInput, setSearchInput] = useState(urlQ);
  const [debouncedQ, setDebouncedQ] = useState(urlQ);
  const [page, setPage] = useState(urlPage);

  // Debounce search input -> debouncedQ (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Keep local state in sync if URL changes externally (back/forward)
  useEffect(() => {
    setStatusFilter(urlStatus);
    setSearchInput(urlQ);
    setDebouncedQ(urlQ);
    setPage(urlPage);
  }, [urlStatus, urlQ, urlPage]);

  // Push URL sync when debouncedQ / statusFilter / page changes (additive, non-breaking)
  const syncUrl = useCallback((next: { status?: string; q?: string; page?: number }) => {
    const p = new URLSearchParams(searchParams.toString());
    const s = next.status !== undefined ? next.status : statusFilter;
    const q = next.q !== undefined ? next.q : debouncedQ;
    const pg = next.page !== undefined ? next.page : page;
    if (s) p.set("status", s); else p.delete("status");
    if (q) p.set("q", q); else p.delete("q");
    if (pg > 1) p.set("page", String(pg)); else p.delete("page");
    const qs = p.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [router, searchParams, statusFilter, debouncedQ, page]);

  useEffect(() => { syncUrl({ q: debouncedQ, page: 1 }); setPage(1); }, [debouncedQ]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { syncUrl({ status: statusFilter, page: 1 }); setPage(1); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    syncUrl({ page: nextPage });
  };

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/v1/agencies?${params}`).then(async (res) => {
      if (res.ok) {
        const b = await res.json();
        setAgencies(b.data ?? []);
      } else {
        showToast("Failed to load agencies", "error");
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [statusFilter]);

  // Client-side search filter (name/slug) — additive, no API change
  const filtered = useMemo(() => {
    if (!debouncedQ) return agencies;
    const q = debouncedQ.toLowerCase();
    return agencies.filter((a) => a.name.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q));
  }, [agencies, debouncedQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / AGENCIES</p>
          <h1>Agency Oversight</h1>
        </div>
        <div className="search-bar">
          <span className="text-mono-sm">{filtered.length} agencies{debouncedQ ? ` (filtered)` : ""}</span>
          <Link href="/dashboard/admin/agencies/new" className="btn btn-primary" style={{ fontSize: 11 }}>+ New Agency</Link>
        </div>
      </div>
      <div className="filter-bar">
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="closed">Closed</option>
        </select>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 340 }}>
          <input
            className="input"
            placeholder="Search name or slug…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search agencies"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 14 }}
            >×</button>
          )}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state"><p>{debouncedQ ? `No agencies match “${debouncedQ}”.` : "No agencies found."}</p></div>
      ) : (
        <>
          <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Currency</th>
                <th>Recording Retention</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => router.push(`/dashboard/admin/agencies/${a.id}`)}
                  title="View agency"
                  style={{ cursor: "pointer" }}
                >
                  <td><strong>{a.name}</strong></td>
                  <td className="text-mono-sm">{a.slug}</td>
                  <td><span className={`badge${a.status === "active" ? " badge-success" : a.status === "suspended" ? " badge-danger" : ""}`}>{a.status}</span></td>
                  <td className="text-mono-sm">{a.currency}</td>
                  <td className="text-mono-sm">{a.recording_retention_days} days</td>
                  <td className="text-mono-sm">{new Date(a.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: "var(--space-4)" }}>
              <button className="pagination-item" disabled={safePage <= 1} onClick={() => handlePageChange(safePage - 1)}>&lsaquo;</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`pagination-item${p === safePage ? " active" : ""}`} onClick={() => handlePageChange(p)}>{p}</button>
              ))}
              <button className="pagination-item" disabled={safePage >= totalPages} onClick={() => handlePageChange(safePage + 1)}>&rsaquo;</button>
            </div>
          )}
          <p className="text-mono-sm" style={{ marginTop: "var(--space-3)", textAlign: "center" }}>{filtered.length} total{totalPages > 1 ? ` — page ${safePage}/${totalPages}` : ""}</p>
        </>
      )}
    </div>
  );
}

export default function AdminAgenciesPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" style={{ height: 18, width: 200 }} /></div>}>
      <AdminAgenciesInner />
    </Suspense>
  );
}
