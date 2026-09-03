"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";

interface Membership {
  id: string;
  agency_id: string;
  user_id: string;
  role: string;
  status: string;
}

const ROLE_OPTIONS = ["super_admin", "admin", "agency", "manager", "finance", "agent"];
const PAGE_SIZE = 10;

function MembersInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialRole = searchParams.get("role") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [page, setPage] = useState(initialPage);
  const hasMounted = useRef(false);

  useEffect(() => {
    fetch("/api/v1/memberships").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setMembers(body.data ?? []);
      }
      setLoading(false);
    });
  }, []);

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
    if (roleFilter) p.set("role", roleFilter);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, roleFilter, page, router, searchParams]);

  async function updateRole(membershipId: string, role: string) {
    try {
      const res = await fetch(`/api/v1/memberships/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const body = await res.json();
      if (res.ok) {
        setMembers((prev) => prev.map((m) => m.id === membershipId ? body.data : m));
        showToast("Role updated", "success");
      } else {
        showToast(body.message ?? "Failed to update role", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  async function updateStatus(membershipId: string, status: string) {
    try {
      const res = await fetch(`/api/v1/memberships/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (res.ok) {
        setMembers((prev) => prev.map((m) => m.id === membershipId ? body.data : m));
        showToast("Status updated", "success");
      } else {
        showToast(body.message ?? "Failed to update status", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  const filtered = useMemo(() => {
    let rows = members;
    if (roleFilter) rows = rows.filter((m) => m.role === roleFilter);
    if (debouncedQ) {
      const q = debouncedQ;
      rows = rows.filter((m) => m.user_id.toLowerCase().includes(q) || m.role.toLowerCase().includes(q) || m.status.toLowerCase().includes(q));
    }
    return rows;
  }, [members, debouncedQ, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const columns: Column<Membership>[] = [
    { key: "user_id", header: "User ID", render: (m) => <span className="text-mono-sm">{m.user_id.slice(0, 12)}</span> },
    {
      key: "role", header: "Role",
      render: (m) => (
        <select className="input" value={m.role} onChange={(e) => updateRole(m.id, e.target.value)} style={{ maxWidth: 140, fontSize: 11 }}>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      ),
    },
    { key: "status", header: "Status", render: (m) => <span className={`badge${m.status === "active" ? " badge-success" : m.status === "suspended" ? " badge-danger" : " badge-warning"}`}>{m.status}</span> },
    {
      key: "actions", header: "Actions",
      render: (m) => m.status === "active" ? (
        <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => updateStatus(m.id, "suspended")}>Suspend</button>
      ) : m.status === "suspended" ? (
        <button className="btn btn-primary" style={{ fontSize: 11 }} onClick={() => updateStatus(m.id, "active")}>Activate</button>
      ) : null,
    },
  ];

  return (
    <div className="dashboard-page">
      <nav className="tabs" style={{ marginBottom: "var(--space-4)" }}>
        <Link className="tab" href="/dashboard/settings">Agency</Link>
        <Link className="tab active" href="/dashboard/settings/members">Members</Link>
        <Link className="tab" href="/dashboard/settings/phone-numbers">Phone Numbers</Link>
      </nav>
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> SETTINGS / MEMBERS</p>
          <h1>Members</h1>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search members..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ maxWidth: 180 }} />
          <select className="input" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} style={{ maxWidth: 130 }}>
            <option value="">All roles</option>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      {loading ? (
        <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>{members.length === 0 ? "No members found. Invite colleagues from your agency." : `No members match "${debouncedQ}".`}</p></div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <DataTable
            columns={columns}
            data={paginated}
            emptyMessage="No members"
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            onPageChange={setPage}
            sortBy="role"
            order="asc"
            onSort={() => {}}
          />
        </div>
      )}
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <MembersInner />
    </Suspense>
  );
}
