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

function MembershipInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState("agent");
  const [inviting, setInviting] = useState(false);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const hasMounted = useRef(false);

  useEffect(() => {
    fetch("/api/v1/memberships").then(async (res) => {
      if (res.ok) { const b = await res.json(); setMembers(b.data ?? []); }
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
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, page, router, searchParams]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteUserId.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/v1/memberships/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: inviteUserId.trim(), role: inviteRole }),
      });
      if (res.ok) {
        const b = await res.json();
        if (b.data) setMembers((prev) => [...prev, b.data]);
        setInviteUserId("");
        showToast("Invitation sent", "success");
      } else {
        const body = await res.json().catch(() => ({}));
        showToast(body.message ?? "Failed to send invitation", "error");
      }
    } catch {
      showToast("Failed to send invitation", "error");
    } finally {
      setInviting(false);
    }
  }

  async function updateRole(membershipId: string, role: string) {
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
        const body = await res.json().catch(() => ({}));
        showToast(body.message ?? "Failed to update role", "error");
      }
    } catch {
      showToast("Failed to update role", "error");
    }
  }

  async function toggleStatus(membershipId: string, current: string) {
    const next = current === "active" ? "suspended" : "active";
    try {
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
        const body = await res.json().catch(() => ({}));
        showToast(body.message ?? `Failed to ${next} membership`, "error");
      }
    } catch {
      showToast(`Failed to ${next} membership`, "error");
    }
  }

  const filtered = useMemo(() => {
    if (!debouncedQ) return members;
    const q = debouncedQ;
    return members.filter((m) => m.user_id.toLowerCase().includes(q) || m.role.toLowerCase().includes(q) || m.status.toLowerCase().includes(q));
  }, [members, debouncedQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const columns: Column<Membership>[] = [
    { key: "user_id", header: "User ID", render: (m) => <Link href={`/dashboard/membership/${m.id}`} className="clickable text-mono-sm">{m.user_id.slice(0, 16)}</Link> },
    {
      key: "role", header: "Role",
      render: (m) => (
        <select className="input" value={m.role} onChange={(e) => updateRole(m.id, e.target.value)} style={{ maxWidth: 140, fontSize: 11 }}>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      ),
    },
    { key: "status", header: "Status", render: (m) => <span className={`badge ${m.status === "active" ? "badge-success" : m.status === "suspended" ? "badge-warning" : m.status === "invited" ? "badge-info" : ""}`}>{m.status}</span> },
    { key: "actions", header: "Actions", render: (m) => <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => toggleStatus(m.id, m.status)}>{m.status === "active" ? "Suspend" : "Activate"}</button> },
  ];

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> SETTINGS / MEMBERSHIP</p>
          <h1>Membership</h1>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search members..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ maxWidth: 180 }} />
          <span className="text-mono-sm">{filtered.length} total</span>
        </div>
      </div>

      <div className="split" style={{ gap: "var(--space-6)", flexWrap: "wrap" } as React.CSSProperties}>
        <div style={{ flex: 2, minWidth: 320, overflowX: "auto" }}>
          {filtered.length === 0 ? (
            <div className="empty-state"><p>{members.length === 0 ? "No members yet. Invite via user ID on the right." : `No members match "${debouncedQ}".`}</p></div>
          ) : (
            <DataTable
              columns={columns}
              data={paginated}
              emptyMessage="No members"
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              onPageChange={setPage}
              sortBy="user_id"
              order="asc"
              onSort={() => {}}
            />
          )}
        </div>
        <form onSubmit={handleInvite} className="card" style={{ flex: 1, minWidth: 280 }}>
          <h2>Invite member</h2>
          <div className="stack" style={{ gap: 8, marginTop: "var(--space-3)" }}>
            <input className="input" placeholder="User ID (from Users table)" value={inviteUserId} onChange={(e) => setInviteUserId(e.target.value)} required />
            <select className="select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button className="btn btn-primary" type="submit" disabled={inviting || !inviteUserId.trim()}>{inviting ? "..." : "Send invite"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MembershipPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <MembershipInner />
    </Suspense>
  );
}
