"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";

interface Lead {
  id: string;
  email_hash: string | null;
  phone_hash: string | null;
  source: string | null;
  status: string;
  assigned_agent_id: string | null;
  call_id: string | null;
  last_call_started_at: string | null;
  last_call_duration_seconds: number | null;
  disposition_outcome: string | null;
  annual_premium_cents: number | null;
  created_at: string;
}

interface Agent { id: string; membership_id: string; user_name?: string; user_email?: string; }

const STATUS_OPTIONS = ["", "new", "contacted", "qualified", "converted", "lost", "disqualified"];
function formatDurationSec(sec: number | null) {
  if (sec === null || sec === undefined) return "\u2014";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}
function formatPremium(cents: number | null) {
  if (cents === null || cents === undefined) return "\u2014";
  return `$${(cents / 100).toFixed(2)}`;
}
const PAGE_SIZE = 10;

function LeadsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialStatus = searchParams.get("status") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [sourceFilter, setSourceFilter] = useState(searchParams.get("source") ?? "");
  const [agentFilter, setAgentFilter] = useState(searchParams.get("agent") ?? "");
  const [startDate, setStartDate] = useState(searchParams.get("start") ?? "");
  const [endDate, setEndDate] = useState(searchParams.get("end") ?? "");
  const [sources, setSources] = useState<string[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentMap, setAgentMap] = useState<Record<string, string>>({});
  const hasMounted = useRef(false);

  useEffect(() => {
    fetch("/api/v1/leads/sources").then(async (r) => { if (r.ok) { const b = await r.json(); setSources(b.data ?? []); } });
    fetch("/api/v1/agents?limit=100").then(async (r) => {
      if (r.ok) {
        const b = await r.json();
        const rows: Agent[] = b.data ?? [];
        setAgents(rows);
        const m: Record<string, string> = {};
        for (const a of rows) if (a.id) m[a.id] = a.user_name || a.user_email || a.membership_id?.slice(0, 8) || a.id.slice(0, 8);
        setAgentMap(m);
      }
    });
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sortBy, order });
    if (debouncedQ) params.set("search", debouncedQ);
    if (statusFilter) params.set("status", statusFilter);
    if (sourceFilter) params.set("source", sourceFilter);
    if (agentFilter) params.set("assignedAgentId", agentFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const res = await fetch(`/api/v1/leads?${params}`);
    if (res.ok) {
      const body = await res.json();
      setLeads(body.data);
      setTotalPages(body.pagination.totalPages);
      setTotal(body.pagination.total);
    }
    setLoading(false);
  }, [page, sortBy, order, debouncedQ, statusFilter, sourceFilter, agentFilter, startDate, endDate]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

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
    if (statusFilter) p.set("status", statusFilter);
    if (sourceFilter) p.set("source", sourceFilter);
    if (agentFilter) p.set("agent", agentFilter);
    if (startDate) p.set("start", startDate);
    if (endDate) p.set("end", endDate);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, statusFilter, sourceFilter, agentFilter, startDate, endDate, page, router, searchParams]);

  function toggleSort(field: string) {
    if (sortBy === field) setOrder(order === "asc" ? "desc" : "asc");
    else { setSortBy(field); setOrder("desc"); }
  }

  async function handleAssign(leadId: string, agentId: string) {
    try {
      const res = await fetch(`/api/v1/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_agent_id: agentId || null }),
      });
      if (res.ok) {
        fetchLeads();
        showToast("Lead assigned", "success");
      } else {
        const body = await res.json();
        showToast(body.message ?? "Failed to assign lead", "error");
      }
    } catch {
      showToast("Network error assigning lead", "error");
    }
  }

  function statusBadge(s: string) {
    const cls: Record<string, string> = { new: "", contacted: "badge-info", qualified: "badge-success", converted: "badge-success", lost: "badge-warning", disqualified: "badge-danger" };
    return `badge ${cls[s] ?? ""}`;
  }

  const columns: Column<Lead>[] = [
    { key: "created_at", header: "Date", sortable: true, render: (l) => <time className="text-mono-sm">{new Date(l.created_at).toLocaleDateString()}</time> },
    { key: "email_hash", header: "Email", render: (l) => <Link href={`/dashboard/leads/${l.id}`} className="clickable">{l.email_hash?.slice(0, 16) ?? "\u2014"}</Link> },
    { key: "phone_hash", header: "Phone", render: (l) => <span className="text-mono-sm">{l.phone_hash?.slice(0, 12) ?? "\u2014"}</span> },
    { key: "source", header: "Source", sortable: true, render: (l) => <span className="badge">{l.source ?? "direct"}</span> },
    { key: "status", header: "Status", sortable: true, render: (l) => <span className={statusBadge(l.status)}>{l.status}</span> },
    { key: "last_call_started_at", header: "Last Call", render: (l) => <span className="text-mono-sm">{l.last_call_started_at ? new Date(l.last_call_started_at).toLocaleDateString() : "\u2014"}</span> },
    { key: "last_call_duration_seconds", header: "Duration", render: (l) => <span className="text-mono-sm">{formatDurationSec(l.last_call_duration_seconds)}</span> },
    { key: "disposition_outcome", header: "Disposition", render: (l) => l.disposition_outcome ? <span className={statusBadge(l.disposition_outcome)}>{l.disposition_outcome}</span> : <span className="text-muted">\u2014</span> },
    { key: "annual_premium_cents", header: "Premium", render: (l) => <span className="text-mono-sm" style={{ color: "var(--accent)" }}>{formatPremium(l.annual_premium_cents)}</span> },
    {
      key: "assigned_agent_id", header: "Assigned",
      render: (l) => (
        <select className="input" style={{ width: 140, padding: "4px 8px", fontSize: 11 }} value={l.assigned_agent_id ?? ""} onChange={(e) => handleAssign(l.id, e.target.value)}>
          <option value="">Unassigned</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{agentMap[a.id] ?? a.membership_id.slice(0, 8)}</option>)}
        </select>
      ),
    },
    {
      key: "delete", header: "",
      render: (l) => (
        <button className="btn btn-ghost btn-sm" onClick={async () => {
          if (!confirm("Delete this lead?")) return;
          try {
            const res = await fetch(`/api/v1/leads/${l.id}`, { method: "DELETE" });
            if (res.ok) {
              fetchLeads();
              showToast("Lead deleted", "success");
            } else {
              const body = await res.json();
              showToast(body.message ?? "Failed to delete lead", "error");
            }
          } catch {
            showToast("Network error deleting lead", "error");
          }
        }}>×</button>
      ),
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> CRM / LEADS</p>
          <h1>Leads</h1>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search leads..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          <a className="btn btn-ghost" href={`/api/v1/leads/export?search=${debouncedQ}&status=${statusFilter}&source=${sourceFilter}&assignedAgentId=${agentFilter}&startDate=${startDate}&endDate=${endDate}`} download>CSV</a>
          <a className="btn btn-ghost" href={`/api/v1/leads/export?format=xlsx&search=${debouncedQ}&status=${statusFilter}&source=${sourceFilter}&assignedAgentId=${agentFilter}&startDate=${startDate}&endDate=${endDate}`} download>Excel</a>
          <span className="text-mono-sm">{total} total</span>
        </div>
      </div>
      <div className="filter-bar">
        <select className="input" style={{ width: 130 }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input" style={{ width: 130 }} value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}>
          <option value="">All sources</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input" style={{ width: 140 }} value={agentFilter} onChange={(e) => { setAgentFilter(e.target.value); setPage(1); }}>
          <option value="">All agents</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{agentMap[a.id] ?? a.membership_id.slice(0, 8)}</option>)}
        </select>
        <input className="input" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} style={{ width: 140 }} />
        <input className="input" type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} style={{ width: 140 }} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <DataTable
          columns={columns}
          data={leads}
          loading={loading}
          emptyMessage="No leads found. Try adjusting search or filters."
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

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <LeadsInner />
    </Suspense>
  );
}
