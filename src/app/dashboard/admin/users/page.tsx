"use client";

import { useState, useEffect } from "react";
import { showToast } from "@/lib/use-toast";

interface Membership {
  id: string;
  agency_id: string;
  user_id: string;
  role: string;
  status: string;
}

const ROLE_OPTIONS = ["super_admin", "admin", "agency", "manager", "finance", "agent"];

export default function AdminUsersPage() {
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/v1/memberships").then(async (res) => {
      if (res.ok) { const b = await res.json(); setMembers(b.data); }
      setLoading(false);
    });
  }, []);

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

  const filtered = search
    ? members.filter((m) => m.user_id.toLowerCase().includes(search.toLowerCase()) || m.role.includes(search))
    : members;

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / USERS</p>
          <h1>User Management</h1>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <span className="text-mono-sm">{filtered.length} users</span>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state"><p>No users found.</p></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Agency</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td className="text-mono-sm">{m.user_id.slice(0, 16)}</td>
                <td className="text-mono-sm">{m.agency_id.slice(0, 8)}</td>
                <td>
                  <select className="input" value={m.role} onChange={(e) => updateRole(m.id, e.target.value)} style={{ maxWidth: 140, fontSize: 12 }}>
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td><span className={`badge${m.status === "active" ? " badge-success" : ""}`}>{m.status}</span></td>
                <td>
                  <button
                    className={`btn ${m.status === "active" ? "btn-secondary" : "btn-primary"}`}
                    style={{ fontSize: 11 }}
                    onClick={() => toggleStatus(m.id, m.status)}
                  >
                    {m.status === "active" ? "Suspend" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
