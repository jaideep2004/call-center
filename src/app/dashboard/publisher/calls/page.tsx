"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import Sparkline from "@/components/sparkline";
import { showToast } from "@/lib/use-toast";
import { formatCents } from "@/lib/format";

interface CallRow {
  id: string;
  uuid: string;
  caller: string | null;
  status: string | null;
  connected: boolean | null;
  payout_cents: number | null;
  recording_url: string | null;
  campaign_name: string | null;
  created_at: string;
}

const PAGE_SIZE = 10;

function PublisherCallsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [rows, setRows] = useState<CallRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const hasMounted = useRef(false);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    // Additive: fetch larger window for client-side search + pagination 10/page (no API change)
    const res = await fetch(`/api/v1/publisher/calls?limit=100&page=1`);
    if (res.ok) {
      const body = await res.json();
      setRows(body.data?.rows ?? []);
      setTotal(body.data?.total ?? (body.data?.rows?.length ?? 0));
    } else {
      showToast("Failed to load calls", "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Debounced search 300ms — resets page
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

  // URL sync ?q=&page
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    const current = searchParams.toString();
    if (qs === current) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, page, router, searchParams]);

  const filtered = useMemo(() => {
    let out = [...rows];
    if (debouncedQ) {
      const q = debouncedQ.toLowerCase();
      out = out.filter((c) => {
        return (
          (c.caller ?? "").toLowerCase().includes(q) ||
          (c.campaign_name ?? "").toLowerCase().includes(q) ||
          (c.status ?? "").toLowerCase().includes(q) ||
          (c.connected ? "connected" : "missed").toLowerCase().includes(q) ||
          new Date(c.created_at).toLocaleString().toLowerCase().includes(q) ||
          (c.uuid ?? "").toLowerCase().includes(q) ||
          String(c.payout_cents ?? "").includes(q)
        );
      });
    }
    out.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortBy === "caller") cmp = (a.caller ?? "").localeCompare(b.caller ?? "");
      else if (sortBy === "campaign_name") cmp = (a.campaign_name ?? "").localeCompare(b.campaign_name ?? "");
      else if (sortBy === "payout_cents") cmp = (a.payout_cents ?? 0) - (b.payout_cents ?? 0);
      else if (sortBy === "status") cmp = (a.status ?? "").localeCompare(b.status ?? "");
      return order === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, debouncedQ, sortBy, order]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  function handleSort(field: string) {
    if (sortBy === field) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setOrder(field === "caller" || field === "campaign_name" ? "asc" : "desc");
    }
  }

  // Payout trend for Sparkline — bucket by day ascending
  const sparklineData: number[] | null = useMemo(() => {
    if (rows.length < 2) return null;
    const byDay = new Map<string, number>();
    const sorted = [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (const r of sorted) {
      const key = r.created_at.slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + (r.payout_cents ?? 0));
    }
    const vals = Array.from(byDay.values());
    return vals.length >= 2 ? vals : rows.map((r) => r.payout_cents ?? 0).filter((v) => v !== 0).length >= 2 ? rows.map((r) => r.payout_cents ?? 0) : null;
  }, [rows]);

  const columns: Column<CallRow>[] = [
    {
      key: "created_at",
      header: "Date",
      sortable: true,
      render: (c) => <span className="text-mono-sm">{new Date(c.created_at).toLocaleString()}</span>,
    },
    {
      key: "caller",
      header: "Caller",
      sortable: true,
      render: (c) => <span className="text-mono-sm">{c.caller ?? "—"}</span>,
    },
    {
      key: "campaign_name",
      header: "Campaign",
      sortable: true,
      render: (c) => c.campaign_name ?? <span className="text-muted">—</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (c) => (
        <span className={`badge ${c.connected ? "badge-success" : "badge-info"}`}>
          {c.connected ? "Connected" : c.status ?? "—"}
        </span>
      ),
    },
    {
      key: "recording_url",
      header: "Recording",
      render: (c) =>
        c.recording_url ? (
          <a href={c.recording_url} target="_blank" rel="noopener noreferrer" className="clickable text-mono-sm">
            ▶ Play
          </a>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "payout_cents",
      header: "Payout",
      sortable: true,
      className: "text-right",
      render: (c) => <span className="text-mono-sm" style={{ fontWeight: 600 }}>{c.payout_cents ? formatCents(c.payout_cents) : "—"}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="stack" style={{ gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-text" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow">
            <i /> PUBLISHER / CALLS
          </p>
          <h1>Calls</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="text-mono-sm" style={{ color: "var(--muted)" }}>
            {filtered.length} of {total} total{debouncedQ ? " (filtered)" : ""}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchCalls(); showToast("Refreshing calls…", "info"); }}>
            Refresh
          </button>
        </div>
      </div>

      {sparklineData && sparklineData.length >= 2 && (
        <section className="card card--spacious">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ font: "500 16px var(--serif)", margin: 0 }}>Payout Trend</h2>
              <p className="text-muted" style={{ fontSize: 11, margin: "4px 0 0" }}>Daily payout (de-duplicated by day)</p>
            </div>
            <span className="text-mono-sm" style={{ color: "var(--muted)" }}>
              {formatCents(sparklineData.reduce((a, b) => a + b, 0))} total · {formatCents(Math.max(...sparklineData))} peak
            </span>
          </div>
          <div style={{ width: "100%", overflow: "hidden", marginTop: "var(--space-4)" }}>
            <Sparkline data={sparklineData} width={720} height={52} responsive />
          </div>
        </section>
      )}

      <div className="filter-bar">
        <div className="filter-bar__primary">
          <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 380 }}>
            <input
              className="input"
              placeholder="Search caller, campaign, status, date…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search calls"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                aria-label="Clear search"
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
        <span className="filter-bar__meta">
          {filtered.length > PAGE_SIZE ? `Page ${safePage} of ${totalPages}` : `${filtered.length} call(s)`}{debouncedQ ? " (filtered)" : ""}
        </span>
      </div>

      <section className="card card--spacious">

        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>
              <strong>{debouncedQ ? `No calls match “${debouncedQ}”` : "No calls yet"}</strong>
            </p>
            <p className="text-muted">{debouncedQ ? "Try a different search or clear the filter." : "Calls routed through your campaign will appear here."}</p>
            {debouncedQ ? (
              <button className="btn btn-secondary btn-sm" style={{ marginTop: "var(--space-4)" }} onClick={() => setSearchInput("")}>
                Clear search
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8, marginTop: "var(--space-4)", justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/dashboard/publisher/campaigns" className="btn btn-primary btn-sm">
                  View Campaigns
                </Link>
                <Link href="/dashboard/publisher" className="btn btn-secondary btn-sm">
                  Back to Overview
                </Link>
              </div>
            )}
          </div>
        ) : (
          <DataTable
              columns={columns}
              data={paged}
              loading={false}
              emptyMessage={debouncedQ ? `No calls match “${debouncedQ}”.` : "No calls yet."}
              page={safePage}
              totalPages={totalPages}
              total={filtered.length}
              onPageChange={setPage}
              sortBy={sortBy}
              order={order}
              onSort={handleSort}
            />
        )}
      </section>
    </div>
  );
}

export default function PublisherCallsPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" style={{ height: 18, width: 200 }} /></div>}>
      <PublisherCallsInner />
    </Suspense>
  );
}
