"use client";

import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";

interface Call {
  id: string;
  campaign_id: string;
  agent_id: string | null;
  provider: string;
  provider_call_id: string;
  state: string;
  from_hash: string | null;
  caller_state: string | null;
  started_at: string | null;
  connected_at: string | null;
  ended_at: string | null;
}

const STATE_COLORS: Record<string, string> = {
  received: "", validating: "", routing: "",
  ringing: "badge-warning", accepted: "badge-info", connecting: "badge-info",
  connected: "badge-success", ended: "", failed: "badge-danger",
  missed: "badge-warning", cancelled: "", disputed: "badge-danger",
};

const PAGE_SIZE = 10;

function CallsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialState = searchParams.get("state") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState("started_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [stateFilter, setStateFilter] = useState(initialState);
  const [simulating, setSimulating] = useState(false);
  const [agentMap, setAgentMap] = useState<Record<string, string>>({});
  const [campaignMap, setCampaignMap] = useState<Record<string, string>>({});
  const hasMounted = useRef(false);

  useEffect(() => {
    fetch("/api/v1/agents?limit=100").then(async (r) => {
      if (!r.ok) return;
      const b = await r.json();
      const rows: Array<{ id: string; user_name?: string; user_email?: string; membership_id?: string }> = b.data ?? [];
      const m: Record<string, string> = {};
      for (const a of rows) if (a.id) m[a.id] = a.user_name || a.user_email || a.membership_id?.slice(0, 8) || a.id.slice(0, 8);
      setAgentMap(m);
    }).catch(() => {});
    fetch("/api/v1/campaigns?limit=100").then(async (r) => {
      if (!r.ok) return;
      const b = await r.json();
      const rows: Array<{ id: string; name?: string }> = b.data ?? [];
      const m: Record<string, string> = {};
      for (const c of rows) if (c.id) m[c.id] = c.name || c.id.slice(0, 8);
      setCampaignMap(m);
    }).catch(() => {});
  }, []);

  async function simulateCall() {
    setSimulating(true);
    try {
      const res = await fetch("/api/v1/routing/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: "+155****4567" }),
      });
      if (res.ok) {
        showToast("Test call created! Check the list below.", "success");
        fetchCalls();
      } else {
        const body = await res.json();
        showToast(body.message ?? "Simulation failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
    setSimulating(false);
  }

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sortBy, order });
    if (debouncedQ) params.set("search", debouncedQ);
    if (stateFilter) params.set("state", stateFilter);
    const res = await fetch(`/api/v1/calls?${params}`);
    if (res.ok) {
      const body = await res.json();
      setCalls(body.data);
      setTotalPages(body.pagination.totalPages);
      setTotal(body.pagination.total);
    }
    setLoading(false);
  }, [page, sortBy, order, debouncedQ, stateFilter]);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== debouncedQ) { setDebouncedQ(trimmed); setPage(1); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, debouncedQ]);

  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return; }
    const p = new URLSearchParams();
    if (debouncedQ) p.set("q", debouncedQ);
    if (stateFilter) p.set("state", stateFilter);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, stateFilter, page, router, searchParams]);

  function toggleSort(field: string) {
    if (sortBy === field) setOrder(order === "asc" ? "desc" : "asc");
    else { setSortBy(field); setOrder("desc"); }
  }

  const columns: Column<Call>[] = [
    { key: "started_at", header: "Started", sortable: true, render: (c) => <span className="text-mono-sm">{c.started_at ? new Date(c.started_at).toLocaleString() : "\u2014"}</span> },
    { key: "id", header: "Call ID", render: (c) => <Link href={`/dashboard/calls/${c.id}`} className="clickable">{c.id.slice(0, 8)}</Link> },
    { key: "state", header: "State", sortable: true, render: (c) => <span className={`badge ${STATE_COLORS[c.state] ?? ""}`}>{c.state}</span> },
    { key: "from_hash", header: "Caller", render: (c) => <span className="text-mono-sm" title={c.from_hash ?? ""}>{c.from_hash?.slice(0, 12) ?? "\u2014"}</span> },
    { key: "caller_state", header: "Caller State", render: (c) => c.caller_state ? <span className="badge badge-info">{c.caller_state}</span> : <span className="text-muted">\u2014</span> },
    { key: "provider", header: "Provider", render: (c) => <span className="text-mono-sm">{c.provider}</span> },
    { key: "agent_id", header: "Agent", render: (c) => c.agent_id ? <span className="text-mono-sm" title={c.agent_id}>{agentMap[c.agent_id] ?? c.agent_id.slice(0, 8)}</span> : <span className="text-muted">\u2014</span> },
    { key: "campaign_id", header: "Campaign", render: (c) => <span className="text-mono-sm" title={c.campaign_id}>{campaignMap[c.campaign_id] ?? c.campaign_id.slice(0, 8)}</span> },
    { key: "connected_at", header: "Connected", render: (c) => <span className="text-mono-sm">{c.connected_at ? new Date(c.connected_at).toLocaleString() : "\u2014"}</span> },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / CALLS</p>
          <h1>Calls</h1>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search calls..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          <a className="btn btn-ghost" href={`/api/v1/calls/export?state=${stateFilter}&search=${debouncedQ}`} download>CSV</a>
          <a className="btn btn-ghost" href={`/api/v1/calls/export?format=xlsx&state=${stateFilter}&search=${debouncedQ}`} download>Excel</a>
          <span className="text-mono-sm">{total} total</span>
        </div>
      </div>
      <div className="filter-bar">
        <select className="input" value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}>
          <option value="">All states</option>
          <option value="received">Received</option>
          <option value="validating">Validating</option>
          <option value="routing">Routing</option>
          <option value="ringing">Ringing</option>
          <option value="accepted">Accepted</option>
          <option value="connecting">Connecting</option>
          <option value="connected">Connected</option>
          <option value="ended">Ended</option>
          <option value="failed">Failed</option>
          <option value="missed">Missed</option>
          <option value="cancelled">Cancelled</option>
          <option value="disputed">Disputed</option>
        </select>
        <button className="btn btn-sm" onClick={simulateCall} disabled={simulating}>{simulating ? "Simulating..." : "Simulate Call"}</button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <DataTable
          columns={columns}
          data={calls}
          loading={loading}
          emptyMessage="No calls found. Try adjusting filters or simulate a test call."
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          sortBy={sortBy}
          order={order}
          onSort={toggleSort}
        />
      </div>
    </div>
  );
}

export default function CallsPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" style={{ width: 200 }} /></div>}>
      <CallsInner />
    </Suspense>
  );
}
