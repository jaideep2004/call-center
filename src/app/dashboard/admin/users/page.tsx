"use client";

import { useState, useEffect, useMemo } from "react";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";

interface Membership {
  id: string;
  agency_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at?: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
}

interface AgencyRow {
  id: string;
  name: string;
  slug: string;
}

const ROLE_OPTIONS = ["super_admin", "admin", "agency", "manager", "finance", "agent"];
const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const [members, setMembers] = useState<Membership[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [agentsMap, setAgentsMap] = useState<Record<string, { name: string; email: string }>>({});

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const [mRes, uRes, aRes, agRes] = await Promise.all([
        fetch("/api/v1/memberships"),
        fetch("/api/v1/users"),
        fetch("/api/v1/agencies"),
        fetch("/api/v1/agents?limit=100"),
      ]);
      if (mRes.ok) {
        const b = await mRes.json();
        setMembers(b.data ?? []);
      }
      if (uRes.ok) {
        const b = await uRes.json();
        // API returns ok(rows) -> body.data
        const rows = b.data ?? b ?? [];
        setUsers(Array.isArray(rows) ? rows : []);
      }
      if (aRes.ok) {
        const b = await aRes.json();
        const rows = b.data ?? [];
        setAgencies(Array.isArray(rows) ? rows : []);
      }
      if (agRes.ok) {
        const b = await agRes.json();
        const rows = b.data ?? [];
        const map: Record<string, { name: string; email: string }> = {};
        for (const ag of rows as any[]) {
          if (ag.membership_id) map[ag.membership_id] = { name: ag.user_name ?? "", email: ag.user_email ?? "" };
          // also map by user_id if available via membership join — fallback
        }
        setAgentsMap(map);
      }
      setLoading(false);
    }
    fetchAll();
  }, []);

  const userMap = useMemo(() => {
    const m = new Map<string, UserRow>();
    for (const u of users) m.set(u.id, u);
    return m;
  }, [users]);

  const agencyMap = useMemo(() => {
    const m = new Map<string, AgencyRow>();
    for (const a of agencies) m.set(a.id, a);
    return m;
  }, [agencies]);

  async function updateRole(membershipId: string, role: string) {
    if (role === "super_admin" && !confirm("Grant super_admin? This gives full system access. Confirm?")) return;
    try {
      const res = await fetch(`/api/v1/memberships/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        const b = await res.json();
        setMembers((prev) => prev.map((m) => m.id === membershipId ? b.data : m));
        showToast("Role updated", "success");
      } else {
        showToast("Failed to update role", "error");
      }
    } catch {
      showToast("Network error updating role", "error");
    }
  }

  async function toggleStatus(membershipId: string, current: string) {
    try {
      const next = current === "active" ? "suspended" : "active";
      const res = await fetch(`/api/v1/memberships/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        const b = await res.json();
        setMembers((prev) => prev.map((m) => m.id === membershipId ? b.data : m));
        showToast(`Membership ${next}`, "success");
      } else {
        showToast("Failed to update status", "error");
      }
    } catch {
      showToast("Network error updating status", "error");
    }
  }

  const filtered = useMemo(() => {
    let out = [...members];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((m) => {
        const u = userMap.get(m.user_id);
        const ag = agencyMap.get(m.agency_id);
        const agentInfo = agentsMap[m.id];
        return (
          (u?.name ?? "").toLowerCase().includes(q) ||
          (u?.email ?? "").toLowerCase().includes(q) ||
          (agentInfo?.name ?? "").toLowerCase().includes(q) ||
          (agentInfo?.email ?? "").toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q) ||
          m.user_id.toLowerCase().includes(q) ||
          (ag?.name ?? "").toLowerCase().includes(q)
        );
      });
    }
    if (roleFilter) out = out.filter((m) => m.role === roleFilter);
    if (statusFilter) out = out.filter((m) => m.status === statusFilter);
    out.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "role") cmp = a.role.localeCompare(b.role);
      else if (sortBy === "status") cmp = a.status.localeCompare(b.status);
      else if (sortBy === "user") {
        const an = userMap.get(a.user_id)?.name ?? agentsMap[a.id]?.name ?? a.user_id;
        const bn = userMap.get(b.user_id)?.name ?? agentsMap[b.id]?.name ?? b.user_id;
        cmp = an.localeCompare(bn);
      } else if (sortBy === "agency") {
        const an = agencyMap.get(a.agency_id)?.name ?? a.agency_id;
        const bn = agencyMap.get(b.agency_id)?.name ?? b.agency_id;
        cmp = an.localeCompare(bn);
      } else if (sortBy === "created_at" && a.created_at && b.created_at) {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return order === "asc" ? cmp : -cmp;
    });
    return out;
  }, [members, search, roleFilter, statusFilter, userMap, agencyMap, agentsMap, sortBy, order]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  function handleSort(field: string) {
    if (sortBy === field) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setOrder("asc"); }
  }

  const columns: Column<Membership>[] = [
    {
      key: "user", header: "User", sortable: true,
      render: (m) => {
        const u = userMap.get(m.user_id);
        const agentInfo = agentsMap[m.id];
        const name = u?.name || agentInfo?.name || null;
        const email = u?.email || agentInfo?.email || null;
        if (name || email) {
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 500 }}>{name || email || m.user_id.slice(0, 8)}</span>
              {email && name && <span className="text-mono-sm" style={{ color: "var(--muted)", fontSize: 11 }}>{email}</span>}
              {!name && email && null}
              <span className="text-mono-sm" style={{ color: "var(--muted)", fontSize: 10 }}>{m.user_id.slice(0, 8)}…</span>
            </div>
          );
        }
        return <span className="text-mono-sm" title={m.user_id}>{m.user_id.slice(0, 16)}</span>;
      },
    },
    {
      key: "agency", header: "Agency", sortable: true,
      render: (m) => {
        const ag = agencyMap.get(m.agency_id);
        if (ag) return <span style={{ fontWeight: 400 }}>{ag.name}</span>;
        return <span className="text-mono-sm" title={m.agency_id}>{m.agency_id.slice(0, 8)}</span>;
      },
    },
    {
      key: "role", header: "Role", sortable: true,
      render: (m) => (
        <select className="input" value={m.role} onChange={(e) => updateRole(m.id, e.target.value)} style={{ maxWidth: 150, fontSize: 12 }}>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      ),
    },
    {
      key: "status", header: "Status", sortable: true,
      render: (m) => <span className={`badge${m.status === "active" ? " badge-success" : m.status === "suspended" ? " badge-danger" : ""}`}>{m.status}</span>,
    },
    {
      key: "actions", header: "Actions", className: "actions-cell",
      render: (m) => (
        <button
          className={`btn btn-sm ${m.status === "active" ? "btn-secondary" : "btn-primary"}`}
          style={{ fontSize: 11, whiteSpace: "nowrap" }}
          onClick={() => toggleStatus(m.id, m.status)}
        >
          {m.status === "active" ? "Suspend" : "Activate"}
        </button>
      ),
    },
  ];

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / USERS</p>
          <h1>User Management</h1>
        </div>
        <div className="search-bar" style={{ flexWrap: "wrap", gap: 8 }}>
          <input className="input" type="search" placeholder="Search name, email, role…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 220 }} />
          <span className="text-mono-sm">{filtered.length} of {members.length} users</span>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: "var(--space-4)" }}>
        <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>
        {(roleFilter || statusFilter || search) && (
          <button className="btn btn-sm btn-ghost" onClick={() => { setSearch(""); setRoleFilter(""); setStatusFilter(""); }}>Clear filters</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><p>No users found.</p><p className="text-muted" style={{ fontSize: 12 }}>Try adjusting search or filters.</p></div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <DataTable
            columns={columns}
            data={paged}
            loading={false}
            emptyMessage="No users found."
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            onPageChange={setPage}
            sortBy={sortBy}
            order={order}
            onSort={handleSort}
          />
        </div>
      )}
    </div>
  );
}
