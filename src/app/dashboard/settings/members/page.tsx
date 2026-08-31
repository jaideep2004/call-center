"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { showToast } from "@/lib/use-toast";

interface Membership {
  id: string;
  agency_id: string;
  user_id: string;
  role: string;
  status: string;
}

const ROLE_OPTIONS = ["super_admin", "admin", "agency", "manager", "finance", "agent"];

export default function MembersPage() {
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/memberships").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setMembers(body.data);
      }
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

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> SETTINGS / MEMBERS</p>
          <h1>Members</h1>
        </div>
      </div>
      <nav className="tabs" style={{ marginBottom: "var(--space-5)" }}>
        <Link className="tab" href="/dashboard/settings">Agency</Link>
        <Link className="tab active" href="/dashboard/settings/members">Members</Link>
        <Link className="tab" href="/dashboard/settings/phone-numbers">Phone Numbers</Link>
      </nav>
      {members.length === 0 ? (
        <div className="empty-state"><p>No members found.</p></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td className="text-mono-sm">{m.user_id.slice(0, 12)}</td>
                <td>
                  <select className="input" value={m.role} onChange={(e) => updateRole(m.id, e.target.value)} style={{ maxWidth: 140 }}>
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td><span className={`badge${m.status === "active" ? " badge-success" : ""}`}>{m.status}</span></td>
                <td>
                  {m.status === "active" ? (
                    <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => updateStatus(m.id, "suspended")}>Suspend</button>
                  ) : m.status === "suspended" ? (
                    <button className="btn btn-primary" style={{ fontSize: 11 }} onClick={() => updateStatus(m.id, "active")}>Activate</button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
