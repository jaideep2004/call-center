"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import Sparkline from "@/components/sparkline";
import { showToast } from "@/lib/use-toast";
import { formatCents } from "@/lib/format";

interface Payouts {
  summary: {
    total_payout_cents: number;
    qualified_calls: number;
    last_30d_payout_cents: number;
    last_30d_qualified_calls: number;
  };
  monthly: { month: string; payout_cents: number; qualified_calls: number }[];
  recent_qualified: {
    id: string;
    caller: string | null;
    payout_cents: number | null;
    campaign_name: string | null;
    created_at: string;
  }[];
}

type MonthlyRow = Payouts["monthly"][number] & { id: string };
const PAGE_SIZE = 10;

function PublisherPayoutsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const initialTab = (searchParams.get("tab") as "monthly" | "calls") ?? "monthly";
  const initialMonthlyPage = initialTab === "monthly" ? initialPage : 1;
  const initialCallsPage = initialTab === "calls" ? initialPage : 1;

  const [data, setData] = useState<Payouts | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [monthlyPage, setMonthlyPage] = useState(initialMonthlyPage);
  const [callsPage, setCallsPage] = useState(initialCallsPage);
  const [activeTab, setActiveTab] = useState<"monthly" | "calls">(initialTab);
  const [monthlySortBy, setMonthlySortBy] = useState<string>("month");
  const [monthlyOrder, setMonthlyOrder] = useState<"asc" | "desc">("desc");
  const [callsSortBy, setCallsSortBy] = useState<string>("created_at");
  const [callsOrder, setCallsOrder] = useState<"asc" | "desc">("desc");
  const hasMounted = useRef(false);

  useEffect(() => {
    fetch("/api/v1/publisher/payouts")
      .then(async (res) => {
        if (res.ok) {
          const body = await res.json();
          setData(body.data ?? null);
        } else {
          showToast("Failed to load payouts", "error");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== debouncedQ) {
        setDebouncedQ(trimmed);
        setMonthlyPage(1);
        setCallsPage(1);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, debouncedQ]);

  // URL sync ?q=&page&tab
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    const currentPage = activeTab === "monthly" ? monthlyPage : callsPage;
    if (currentPage > 1) params.set("page", String(currentPage));
    if (activeTab !== "monthly") params.set("tab", activeTab);
    const qs = params.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, monthlyPage, callsPage, activeTab, router, searchParams]);

  const monthlyWithId: MonthlyRow[] = useMemo(() => {
    const list = data?.monthly ?? [];
    return list.map((m) => ({ ...m, id: m.month }));
  }, [data]);

  const filteredMonthly = useMemo(() => {
    let out = [...monthlyWithId];
    if (debouncedQ) {
      const q = debouncedQ.toLowerCase();
      out = out.filter((m) => m.month.toLowerCase().includes(q) || String(m.payout_cents).includes(q) || String(m.qualified_calls).includes(q));
    }
    out.sort((a, b) => {
      let cmp = 0;
      if (monthlySortBy === "month") cmp = a.month.localeCompare(b.month);
      else if (monthlySortBy === "payout_cents") cmp = a.payout_cents - b.payout_cents;
      else if (monthlySortBy === "qualified_calls") cmp = a.qualified_calls - b.qualified_calls;
      return monthlyOrder === "asc" ? cmp : -cmp;
    });
    return out;
  }, [monthlyWithId, debouncedQ, monthlySortBy, monthlyOrder]);

  const filteredCalls = useMemo(() => {
    let out = [...(data?.recent_qualified ?? [])];
    if (debouncedQ) {
      const q = debouncedQ.toLowerCase();
      out = out.filter((c) => {
        return (
          (c.caller ?? "").toLowerCase().includes(q) ||
          (c.campaign_name ?? "").toLowerCase().includes(q) ||
          new Date(c.created_at).toLocaleString().toLowerCase().includes(q) ||
          String(c.payout_cents ?? "").includes(q)
        );
      });
    }
    out.sort((a, b) => {
      let cmp = 0;
      if (callsSortBy === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (callsSortBy === "caller") cmp = (a.caller ?? "").localeCompare(b.caller ?? "");
      else if (callsSortBy === "campaign_name") cmp = (a.campaign_name ?? "").localeCompare(b.campaign_name ?? "");
      else if (callsSortBy === "payout_cents") cmp = (a.payout_cents ?? 0) - (b.payout_cents ?? 0);
      return callsOrder === "asc" ? cmp : -cmp;
    });
    return out;
  }, [data, debouncedQ, callsSortBy, callsOrder]);

  const monthlyTotalPages = Math.max(1, Math.ceil(filteredMonthly.length / PAGE_SIZE));
  const safeMonthlyPage = Math.min(monthlyPage, monthlyTotalPages);
  const pagedMonthly = useMemo(() => {
    const start = (safeMonthlyPage - 1) * PAGE_SIZE;
    return filteredMonthly.slice(start, start + PAGE_SIZE);
  }, [filteredMonthly, safeMonthlyPage]);

  const callsTotalPages = Math.max(1, Math.ceil(filteredCalls.length / PAGE_SIZE));
  const safeCallsPage = Math.min(callsPage, callsTotalPages);
  const pagedCalls = useMemo(() => {
    const start = (safeCallsPage - 1) * PAGE_SIZE;
    return filteredCalls.slice(start, start + PAGE_SIZE);
  }, [filteredCalls, safeCallsPage]);

  useEffect(() => {
    if (monthlyPage > monthlyTotalPages) setMonthlyPage(monthlyTotalPages);
  }, [monthlyTotalPages, monthlyPage]);
  useEffect(() => {
    if (callsPage > callsTotalPages) setCallsPage(callsTotalPages);
  }, [callsTotalPages, callsPage]);

  function handleMonthlySort(field: string) {
    if (monthlySortBy === field) setMonthlyOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setMonthlySortBy(field);
      setMonthlyOrder(field === "month" ? "desc" : "desc");
    }
  }
  function handleCallsSort(field: string) {
    if (callsSortBy === field) setCallsOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setCallsSortBy(field);
      setCallsOrder(field === "caller" || field === "campaign_name" ? "asc" : "desc");
    }
  }

  const sparklineData: number[] | null = useMemo(() => {
    if (!data || data.monthly.length < 2) return null;
    // sort ascending by month for sparkline
    const sorted = [...data.monthly].sort((a, b) => a.month.localeCompare(b.month));
    return sorted.map((m) => m.payout_cents);
  }, [data]);

  const monthlyColumns: Column<MonthlyRow>[] = [
    { key: "month", header: "Month", sortable: true, render: (m) => <span className="text-mono-sm">{m.month}</span> },
    { key: "qualified_calls", header: "Qualified Calls", sortable: true, render: (m) => <span className="text-mono-sm">{m.qualified_calls}</span> },
    {
      key: "payout_cents",
      header: "Payout",
      sortable: true,
      className: "text-right",
      render: (m) => <span className="text-mono-sm" style={{ fontWeight: 600 }}>{formatCents(m.payout_cents)}</span>,
    },
  ];

  const callsColumns: Column<Payouts["recent_qualified"][number]>[] = [
    {
      key: "created_at",
      header: "Date",
      sortable: true,
      render: (c) => <span className="text-mono-sm">{new Date(c.created_at).toLocaleString()}</span>,
    },
    { key: "caller", header: "Caller", sortable: true, render: (c) => <span className="text-mono-sm">{c.caller ?? "—"}</span> },
    { key: "campaign_name", header: "Campaign", sortable: true, render: (c) => c.campaign_name ?? <span className="text-muted">—</span> },
    {
      key: "payout_cents",
      header: "Payout",
      sortable: true,
      className: "text-right",
      render: (c) => <span className="text-mono-sm" style={{ fontWeight: 600 }}>{formatCents(c.payout_cents ?? 0)}</span>,
    },
  ];

  if (loading)
    return (
      <div className="dashboard-page">
        <div className="stack" style={{ gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
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
            <i /> PUBLISHER / PAYOUTS
          </p>
          <h1>Payouts</h1>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            const rows = data?.monthly ?? [];
            if (rows.length === 0) {
              showToast("No payout data to export", "info");
              return;
            }
            const header = "month,payout_cents,qualified_calls";
            const csv = [header, ...rows.map((r) => `${r.month},${r.payout_cents},${r.qualified_calls}`)].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "payouts-monthly.csv";
            a.click();
            URL.revokeObjectURL(url);
            showToast("Monthly history exported", "success");
          }}
        >
          Export CSV
        </button>
      </div>

      <div className="grid-4" style={{ marginBottom: 4 }}>
        <div className="card stat-card">
          <p className="text-mono-sm">TOTAL PAYOUTS</p>
          <p className="stat-value">{formatCents(data?.summary.total_payout_cents ?? 0)}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">QUALIFIED CALLS</p>
          <p className="stat-value">{data?.summary.qualified_calls ?? 0}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">LAST 30 DAYS</p>
          <p className="stat-value">{formatCents(data?.summary.last_30d_payout_cents ?? 0)}</p>
        </div>
        <div className="card stat-card">
          <p className="text-mono-sm">30-DAY QUALIFIED</p>
          <p className="stat-value">{data?.summary.last_30d_qualified_calls ?? 0}</p>
        </div>
      </div>

      {sparklineData && sparklineData.length >= 2 && (
        <section className="card card--spacious">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ font: "500 18px var(--serif)", margin: 0 }}>Revenue Trend</h2>
              <p className="text-muted" style={{ fontSize: 11, margin: "4px 0 0" }}>Monthly payout — chronological</p>
            </div>
            <span className="text-mono-sm" style={{ color: "var(--muted)" }}>
              {formatCents(sparklineData.reduce((a, b) => a + b, 0))} total · {formatCents(Math.max(...sparklineData))} peak
            </span>
          </div>
          <div style={{ width: "100%", overflow: "hidden", marginTop: "var(--space-4)" }}>
            <Sparkline data={sparklineData} width={720} height={64} responsive />
          </div>
        </section>
      )}

      <div className="filter-bar">
        <div className="filter-bar__segment">
          <button
            className={`btn btn-sm ${activeTab === "monthly" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("monthly")}
          >
            Monthly
          </button>
          <button
            className={`btn btn-sm ${activeTab === "calls" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("calls")}
          >
            Qualified Calls
          </button>
        </div>
        <div className="filter-bar__primary">
          <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 380 }}>
            <input
              className="input"
              placeholder={activeTab === "monthly" ? "Search month, payout…" : "Search caller, campaign…"}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search payouts"
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
          {activeTab === "monthly" ? `${filteredMonthly.length} month(s)` : `${filteredCalls.length} call(s)`}
          {debouncedQ ? " (filtered)" : ""}
          {activeTab === "monthly" && filteredMonthly.length > PAGE_SIZE ? ` — page ${safeMonthlyPage}/${monthlyTotalPages}` : ""}
          {activeTab === "calls" && filteredCalls.length > PAGE_SIZE ? ` — page ${safeCallsPage}/${callsTotalPages}` : ""}
        </span>
      </div>

      {activeTab === "monthly" ? (
        <section className="card card--spacious">
          <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)" }}>Monthly History</h2>
          {!data || monthlyWithId.length === 0 ? (
            <div className="empty-state">
              <p>
                <strong>No payout history yet</strong>
              </p>
              <p className="text-muted" style={{ fontSize: 12 }}>Qualified calls will appear here once payouts are recorded.</p>
              <div style={{ display: "flex", gap: 8, marginTop: "var(--space-4)", justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/dashboard/publisher/calls" className="btn btn-primary btn-sm">
                  View Calls
                </Link>
                <Link href="/dashboard/publisher" className="btn btn-secondary btn-sm">
                  Overview
                </Link>
              </div>
            </div>
          ) : filteredMonthly.length === 0 ? (
            <div className="empty-state">
              <p>No months match &quot;{debouncedQ}&quot;.</p>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: "var(--space-4)" }} onClick={() => setSearchInput("")}>
                Clear search
              </button>
            </div>
          ) : (
              <DataTable
                columns={monthlyColumns}
                data={pagedMonthly}
                loading={false}
                emptyMessage="No months match your search."
                page={safeMonthlyPage}
                totalPages={monthlyTotalPages}
                total={filteredMonthly.length}
                onPageChange={setMonthlyPage}
                sortBy={monthlySortBy}
                order={monthlyOrder}
                onSort={handleMonthlySort}
              />
          )}
        </section>
      ) : (
        <section className="card card--spacious">
          <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)" }}>Recent Qualified Calls</h2>
          {!data || data.recent_qualified.length === 0 ? (
            <div className="empty-state">
              <p>
                <strong>No qualified calls yet</strong>
              </p>
              <p className="text-muted" style={{ fontSize: 12 }}>Qualified calls earn payout once they meet the campaign&apos;s duration and quality rules.</p>
              <div style={{ display: "flex", gap: 8, marginTop: "var(--space-4)", justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/dashboard/publisher/calls" className="btn btn-primary btn-sm">
                  View Calls
                </Link>
                <button className="btn btn-secondary btn-sm" onClick={() => showToast("Qualification requires connected duration ≥ campaign threshold.", "info")}>
                  How it works
                </button>
              </div>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="empty-state">
              <p>No qualified calls match &quot;{debouncedQ}&quot;.</p>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: "var(--space-4)" }} onClick={() => setSearchInput("")}>
                Clear search
              </button>
            </div>
          ) : (
              <DataTable
                columns={callsColumns}
                data={pagedCalls}
                loading={false}
                emptyMessage="No qualified calls match your search."
                page={safeCallsPage}
                totalPages={callsTotalPages}
                total={filteredCalls.length}
                onPageChange={setCallsPage}
                sortBy={callsSortBy}
                order={callsOrder}
                onSort={handleCallsSort}
              />
          )}
        </section>
      )}
    </div>
  );
}

export default function PublisherPayoutsPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" style={{ height: 18, width: 200 }} /></div>}>
      <PublisherPayoutsInner />
    </Suspense>
  );
}
