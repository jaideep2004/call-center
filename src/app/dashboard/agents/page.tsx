"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "25" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/v1/agents?${params}`);
    if (res.ok) {
      const body = await res.json();
      setAgents(body.data ?? body);
      setTotalPages(body.pagination?.totalPages ?? 1);
      setTotal(body.pagination?.total ?? 0);
    }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

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
      default: return "badge";
    }
  }

  const columns: Column<Agent>[] = [
    {
      key: "availability", header: "Status",
      render: (a) => <span className={a.availability === "available" ? "text-success" : "text-muted"} style={{ fontSize: 16 }}>{a.availability === "available" ? "\u25CF" : "\u25CB"}</span>,
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
      key: "actions", header: "Actions",
      render: (a) => (
        <div className="stack-h" style={{ gap: 4 }}>
          {a.approval_status !== "approved" && (
            <button className="btn btn-sm" style={{ background: "var(--accent)", color: "#0a0a0a", border: "none" }} onClick={() => updateApproval(a.id, "approved")}>Approve</button>
          )}
          {a.approval_status !== "rejected" && (
            <button className="btn btn-sm btn-secondary" onClick={() => updateApproval(a.id, "rejected")}>Decline</button>
          )}
          {a.approval_status === "approved" && (
            <button className="btn btn-sm btn-secondary" onClick={() => updateApproval(a.id, "suspended")}>Suspend</button>
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
          <input className="input" type="search" placeholder="Search by name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <Link href="/dashboard/agents/new" className="btn btn-primary">+ Invite</Link>
          <span className="text-mono-sm">{total} total</span>
        </div>
      </div>

      <div className="stack-h" style={{ gap: 6, marginBottom: "var(--space-4)" }}>
        {["", "pending", "approved", "rejected", "suspended"].map((s) => (
          <button key={s} className={`btn btn-sm${statusFilter === s ? " btn-primary" : ""}`} onClick={() => { setStatusFilter(s); setPage(1); }}>
            {s || "All"}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={agents}
        loading={loading}
        emptyMessage="No agents found."
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
