"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";

interface EarningsRow {
  id: string;
  agent_id: string;
  call_count: number;
  total_seconds: number;
  total_cents: number;
  avg_cents: number;
}

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function formatCents(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}
const PAGE_SIZE = 10;

function EarningsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [rows, setRows] = useState<EarningsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [agentMap, setAgentMap] = useState<Record<string, string>>({});
  const [startDate, setStartDate] = useState(searchParams.get("start") ?? "");
  const [endDate, setEndDate] = useState(searchParams.get("end") ?? "");
  const hasMounted = useRef(false);

  useEffect(() => {
    fetch("/api/v1/agents?limit=100").then(async (r) => {
      if (!r.ok) return;
      const b = await r.json();
      const list: Array<{ id: string; user_name?: string; user_email?: string; membership_id?: string }> = b.data ?? [];
      const m: Record<string, string> = {};
      for (const a of list) if (a.id) m[a.id] = a.user_name || a.user_email || a.membership_id?.slice(0, 8) || a.id.slice(0, 8);
      setAgentMap(m);
    }).catch(() => {});
  }, []);

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const res = await fetch(`/api/v1/agents/earnings?${params}`);
    if (res.ok) {
      const body = await res.json();
      const raw: Omit<EarningsRow, "id">[] = body.data ?? [];
      setRows(raw.map((r) => ({ ...r, id: r.agent_id })));
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);

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
    if (startDate) p.set("start", startDate);
    if (endDate) p.set("end", endDate);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, startDate, endDate, page, router, searchParams]);

  const filtered = useMemo(() => {
    if (!debouncedQ) return rows;
    const q = debouncedQ;
    return rows.filter((r) => (agentMap[r.agent_id] ?? r.agent_id).toLowerCase().includes(q));
  }, [rows, debouncedQ, agentMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const totalCents = filtered.reduce((s, r) => s + r.total_cents, 0);
  const totalCalls = filtered.reduce((s, r) => s + r.call_count, 0);

  const columns: Column<EarningsRow>[] = [
    { key: "agent_id", header: "Agent", render: (r) => <Link href={`/dashboard/agents/${r.agent_id}`} className="clickable" style={{ fontWeight: 500 }}>{agentMap[r.agent_id] ?? r.agent_id.slice(0, 8)}</Link> },
    { key: "call_count", header: "Calls", render: (r) => <span className="badge badge-info">{r.call_count}</span> },
    { key: "total_seconds", header: "Duration", render: (r) => <span className="text-mono-sm">{formatDuration(r.total_seconds)}</span> },
    { key: "total_cents", header: "Total", render: (r) => <span className="text-mono-sm" style={{ color: "var(--accent)", fontWeight: 600 }}>{formatCents(r.total_cents)}</span> },
    { key: "avg_cents", header: "Avg / Call", render: (r) => <span className="text-mono-sm">{formatCents(r.avg_cents)}</span> },
  ];

  if (loading) return <div className="dashboard-page"><div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / AGENT EARNINGS</p>
          <h1>Agent Earnings</h1>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search agent..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ minWidth: 180 }} />
          <span className="text-mono-sm" style={{ whiteSpace: "nowrap" }}>{formatCents(totalCents)} total · {totalCalls} calls</span>
        </div>
      </div>
      <div className="filter-bar">
        <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ maxWidth: 160 }} />
        <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ maxWidth: 160 }} />
        <span className="text-mono-sm" style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 11 }}>{filtered.length} agents shown</span>
        {(startDate || endDate) && <button className="btn btn-ghost btn-sm" onClick={() => { setStartDate(""); setEndDate(""); }}>Clear dates</button>}
      </div>
      {rows.length === 0 ? (
        <div className="empty-state"><p>No earnings data yet. Earnings appear after qualifying calls are completed.</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>No agents match &quot;{debouncedQ}&quot;.</p></div>
      ) : (
        <DataTable
            columns={columns}
            data={paginated}
            emptyMessage="No earnings"
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            onPageChange={setPage}
            sortBy="total_cents"
            order="desc"
            onSort={() => {}}
          />
      )}
    </div>
  );
}

export default function AgentEarningsPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <EarningsInner />
    </Suspense>
  );
}
