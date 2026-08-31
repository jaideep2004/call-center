"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
  ringing: "", accepted: "", connecting: "",
  connected: "badge-success", ended: "", failed: "badge-danger",
  missed: "badge-warning", cancelled: "", disputed: "badge-danger",
};

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState("started_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [stateFilter, setStateFilter] = useState("");
  const [simulating, setSimulating] = useState(false);

  async function simulateCall() {
    setSimulating(true);
    try {
      const res = await fetch("/api/v1/routing/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: "+15551234567" }),
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
    const params = new URLSearchParams({ page: String(page), limit: "25", sortBy, order });
    if (search) params.set("search", search);
    if (stateFilter) params.set("state", stateFilter);
    const res = await fetch(`/api/v1/calls?${params}`);
    if (res.ok) {
      const body = await res.json();
      setCalls(body.data);
      setTotalPages(body.pagination.totalPages);
      setTotal(body.pagination.total);
    }
    setLoading(false);
  }, [page, sortBy, order, search, stateFilter]);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  function toggleSort(field: string) {
    if (sortBy === field) setOrder(order === "asc" ? "desc" : "asc");
    else { setSortBy(field); setOrder("desc"); }
  }

  const columns: Column<Call>[] = [
    { key: "started_at", header: "Started", sortable: true, render: (c) => <span className="text-mono-sm">{c.started_at ? new Date(c.started_at).toLocaleString() : "—"}</span> },
    { key: "id", header: "Call ID", render: (c) => <Link href={`/dashboard/calls/${c.id}`} className="clickable">{c.id.slice(0, 8)}</Link> },
    { key: "state", header: "State", sortable: true, render: (c) => <span className={`badge ${STATE_COLORS[c.state] ?? ""}`}>{c.state}</span> },
    { key: "from_hash", header: "Caller", render: (c) => <span className="text-mono-sm" title={c.from_hash ?? ""}>{c.from_hash?.slice(0, 12) ?? "—"}</span> },
    { key: "caller_state", header: "State", render: (c) => <span className="badge badge-info">{c.caller_state ?? "—"}</span> },
    { key: "provider", header: "Provider", render: (c) => <span className="text-mono-sm">{c.provider}</span> },
    { key: "agent_id", header: "Agent", render: (c) => <span className="text-mono-sm">{c.agent_id ? c.agent_id.slice(0, 8) : "—"}</span> },
    { key: "connected_at", header: "Connected", render: (c) => <span className="text-mono-sm">{c.connected_at ? new Date(c.connected_at).toLocaleString() : "—"}</span> },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / CALLS</p>
          <h1>Calls</h1>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search calls..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <a className="btn btn-ghost" href={`/api/v1/calls/export?state=${stateFilter}&search=${search}`} download>CSV</a>
          <a className="btn btn-ghost" href={`/api/v1/calls/export?format=xlsx&state=${stateFilter}&search=${search}`} download>Excel</a>
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
      </div>
      <DataTable
        columns={columns}
        data={calls}
        loading={loading}
        emptyMessage="No calls found."
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        sortBy={sortBy}
        order={order}
        onSort={toggleSort}
      />
    </div>
  );
}
