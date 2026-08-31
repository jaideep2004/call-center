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

export default function MembershipPage() {
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState("agent");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetch("/api/v1/memberships").then(async (res) => {
      if (res.ok) { const b = await res.json(); setMembers(b.data); }
      setLoading(false);
    });
  }, []);

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
        <span className="text-mono-sm">{members.length} members</span>
      </div>

      <div className="split" style={{ "--gap": "var(--space-6)" } as React.CSSProperties}>
        <div style={{ flex: 2 }}>
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
              {members.length === 0 ? (
                <tr><td colSpan={4}><div className="empty-state"><p>No members yet.</p></div></td></tr>
              ) : members.map((m) => (
                <tr key={m.id}>
                  <td><Link href={`/dashboard/membership/${m.id}`} className="clickable">{m.user_id.slice(0, 16)}</Link></td>
                  <td>
                    <select className="input" value={m.role} onChange={(e) => updateRole(m.id, e.target.value)} style={{ maxWidth: 140, fontSize: 12 }}>
                      {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td><span className={`badge${m.status === "active" ? " badge-success" : ""}${m.status === "invited" ? "" : ""}${m.status === "suspended" ? " badge-warning" : ""}`}>{m.status}</span></td>
                  <td>
                    <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => toggleStatus(m.id, m.status)}>
                      {m.status === "active" ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card" style={{ flex: 1, alignSelf: "start" }}>
          <h2>Invite Member</h2>
          <form onSubmit={handleInvite} className="stack" style={{ gap: "var(--space-3)" }}>
            <label className="text-mono-sm" style={{ fontSize: 10, letterSpacing: 1, color: "var(--muted)" }}>USER ID</label>
            <input className="input" value={inviteUserId} onChange={(e) => setInviteUserId(e.target.value)} placeholder="auth user id..." />
            <label className="text-mono-sm" style={{ fontSize: 10, letterSpacing: 1, color: "var(--muted)" }}>ROLE</label>
            <select className="input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button className="btn btn-primary" type="submit" disabled={inviting || !inviteUserId.trim()}>
              {inviting ? "Inviting..." : "Send Invite"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
