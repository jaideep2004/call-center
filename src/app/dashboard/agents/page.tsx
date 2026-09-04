"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";

interface Agent {
  id: string;
  membership_id: string;
  approval_status: string;
  availability: string;
  priority: number;
  states: string[];
  skills: string[];
  licenses: string[];
  endpoint_types: string[];
  last_assigned_at: string | null;
  user_name: string;
  user_email: string;
}

const PAGE_SIZE = 10;

function AgentsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialStatus = searchParams.get("status") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const hasMounted = useRef(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (debouncedQ) params.set("search", debouncedQ);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/v1/agents?${params}`);
    if (res.ok) {
      const body = await res.json();
      setAgents(body.data ?? body);
      setTotalPages(body.pagination?.totalPages ?? 1);
      setTotal(body.pagination?.total ?? 0);
    }
    setLoading(false);
  }, [page, debouncedQ, statusFilter]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  // Debounce 300ms
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

  // URL sync ?q=&status=&page
  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return; }
    const p = new URLSearchParams();
    if (debouncedQ) p.set("q", debouncedQ);
    if (statusFilter) p.set("status", statusFilter);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, statusFilter, page, router, searchParams]);

  async function updateApproval(id: string, status: string) {
    try {
      const res = await fetch(`/api/v1/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval_status: status }),
      });
      if (res.ok) {
        showToast(`Agent ${status}`, "success");
        fetchAgents();
      } else {
        const body = await res.json();
        showToast(body.message ?? "Failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  function badgeClass(status: string) {
    switch (status) {
      case "approved": return "badge badge-success";
      case "rejected": return "badge badge-danger";
      case "suspended": return "badge badge-warning";
      case "pending": return "badge badge-info";
      default: return "badge";
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const columns: Column<Agent>[] = [
    {
      key: "select", header: "",
      render: (a) => <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleSelect(a.id)} aria-label={`Select ${a.id}`} style={{ accentColor: "var(--accent)" }} />,
    },
    {
      key: "availability", header: "Status",
      render: (a) => <span className={a.availability === "available" ? "text-success" : "text-muted"} style={{ fontSize: 16 }} title={a.availability}>{a.availability === "available" ? "\u25CF" : "\u25CB"}</span>,
    },
    {
      key: "user_name", header: "Name",
      render: (a) => <Link href={`/dashboard/agents/${a.id}`} className="clickable" style={{ fontWeight: 500 }}>{a.user_name || a.membership_id.slice(0, 8)}</Link>,
    },
    { key: "user_email", header: "Email", render: (a) => <span className="text-mono-sm">{a.user_email}</span> },
    {
      key: "approval_status", header: "Approval",
      render: (a) => <span className={badgeClass(a.approval_status)}>{a.approval_status}</span>,
    },
    {
      key: "skills", header: "Skills",
      render: (a) => <span className="text-mono-sm">{a.skills?.slice(0, 3).join(", ") || "\u2014"}</span>,
    },
    {
      key: "actions", header: "Actions", className: "actions-cell",
      render: (a) => (
        <div className="stack-h" style={{ gap: 6, justifyContent: "flex-end" }}>
          {a.approval_status !== "approved" && (
            <button className="btn btn-sm" style={{ background: "var(--accent)", color: "#0a0a0a", border: "none", whiteSpace: "nowrap" }} onClick={() => updateApproval(a.id, "approved")}>Approve</button>
          )}
          {a.approval_status !== "rejected" && (
            <button className="btn btn-sm btn-secondary" style={{ whiteSpace: "nowrap" }} onClick={() => updateApproval(a.id, "rejected")}>Decline</button>
          )}
          {a.approval_status === "approved" && (
            <button className="btn btn-sm btn-secondary" style={{ whiteSpace: "nowrap" }} onClick={() => updateApproval(a.id, "suspended")}>Suspend</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / AGENTS</p>
          <h1>Agents</h1>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search by name or email..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ minWidth: 220 }} />
          <Link href="/dashboard/agents/new" className="btn btn-primary">+ Invite</Link>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: "var(--space-1)" }}>
        {["", "pending", "approved", "rejected", "suspended"].map((s) => (
          <button key={s} className={`btn btn-sm${statusFilter === s ? " btn-primary" : " btn-secondary"}`} onClick={() => { setStatusFilter(s); setPage(1); }} style={{ textTransform: "capitalize" }}>
            {s || "All"}
          </button>
        ))}
        <span className="text-mono-sm" style={{ marginLeft: "auto", whiteSpace: "nowrap", color: "var(--muted)" }}>{total} total</span>
      </div>

      {selected.size > 0 && (
        <div className="card" style={{ padding: "var(--space-3) var(--space-4)", marginBottom: "var(--space-2)", display: "flex", gap: 8, alignItems: "center", background: "var(--panel)" }}>
          <span className="text-mono-sm">{selected.size} selected</span>
          <button className="btn btn-sm btn-secondary" onClick={() => showToast("Bulk actions coming soon — approve/reject selected agents", "info")}>Bulk actions</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      <DataTable
          columns={columns}
          data={agents}
          loading={loading}
          emptyMessage="No agents found. Try adjusting search or filters, or invite a new agent."
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          sortBy=""
          order="desc"
          onSort={() => {}}
        />
    </div>
  );
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" style={{ width: 200 }} /></div>}>
      <AgentsInner />
    </Suspense>
  );
}
