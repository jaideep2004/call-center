"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { formatCents, formatDuration } from "@/lib/format";

interface TopPerformer {
  id: string;
  agent_id: string;
  call_count: number;
  total_seconds: number;
  total_cents: number;
  conversion_count: number;
  conversion_rate: number;
}
const PAGE_SIZE = 10;
function TopInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const [rows, setRows] = useState<TopPerformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(Number(searchParams.get("days") ?? "30") || 30);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [agentMap, setAgentMap] = useState<Record<string, string>>({});
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

  const fetchPerformers = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/v1/agents/top-performers?days=${days}&limit=20`);
    if (res.ok) {
      const body = await res.json();
      const raw: Omit<TopPerformer, "id">[] = body.data ?? [];
      setRows(raw.map((r) => ({ ...r, id: r.agent_id })));
    }
    setLoading(false);
  }, [days]);

  useEffect(() => { fetchPerformers(); }, [fetchPerformers]);

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
    if (days !== 30) p.set("days", String(days));
    if (debouncedQ) p.set("q", debouncedQ);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [days, debouncedQ, page, router, searchParams]);

  const filtered = useMemo(() => {
    if (!debouncedQ) return rows;
    const q = debouncedQ;
    return rows.filter((r) => (agentMap[r.agent_id] ?? r.agent_id).toLowerCase().includes(q));
  }, [rows, debouncedQ, agentMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  // Fix rank column render correctly without index misuse
  const cols: Column<TopPerformer>[] = [
    { key: "rank", header: "#", render: (r) => <span className="text-mono-sm" style={{ color: "var(--muted)" }}>{filtered.indexOf(r) + 1}</span> },
    { key: "agent_id", header: "Agent", render: (r) => <Link href={`/dashboard/agents/${r.agent_id}`} className="clickable" style={{ fontWeight: 500 }}>{agentMap[r.agent_id] ?? r.agent_id.slice(0, 8)}</Link> },
    { key: "call_count", header: "Calls", render: (r) => <span className="badge badge-info">{r.call_count}</span> },
    { key: "total_seconds", header: "Duration", render: (r) => <span className="text-mono-sm">{formatDuration(r.total_seconds)}</span> },
    { key: "total_cents", header: "Revenue", render: (r) => <span className="text-mono-sm" style={{ color: "var(--accent)" }}>{formatCents(r.total_cents)}</span> },
    { key: "conversion_count", header: "Conversions", render: (r) => <span className="text-mono-sm">{r.conversion_count}</span> },
    { key: "conversion_rate", header: "Rate", render: (r) => <span className="badge badge-success">{r.conversion_rate}%</span> },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / TOP PERFORMERS</p>
          <h1>Top Performers</h1>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search agent..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ maxWidth: 160 }} />
          <select className="select" value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ maxWidth: 100 }}>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
      </div>
      {loading ? (
        <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : rows.length === 0 ? (
        <div className="empty-state"><p>No performance data yet. Check back after calls are completed.</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>No agents match &quot;{debouncedQ}&quot;.</p></div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <DataTable
            columns={cols}
            data={paginated}
            emptyMessage="No performers"
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            onPageChange={setPage}
            sortBy="total_cents"
            order="desc"
            onSort={() => {}}
          />
        </div>
      )}
    </div>
  );
}

export default function TopPerformersPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <TopInner />
    </Suspense>
  );
}
