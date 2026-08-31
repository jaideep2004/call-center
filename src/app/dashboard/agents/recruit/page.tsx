"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { showToast } from "@/lib/use-toast";

interface Invite {
  id: string;
  invitee_email: string;
  token: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export default function RecruitPage() {
  const { data: session } = authClient.useSession();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [subAgencies, setSubAgencies] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateSub, setShowCreateSub] = useState(false);
  const [subName, setSubName] = useState("");
  const [subSlug, setSubSlug] = useState("");
  const [subCommission, setSubCommission] = useState(10);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/invites").then(r => r.ok ? r.json() : { data: [] }),
      fetch("/api/v1/agencies").then(r => r.ok ? r.json() : { data: [] }),
    ]).then(([invitesBody, agenciesBody]) => {
      setInvites(invitesBody.data ?? []);
      setSubAgencies((agenciesBody.data ?? []).filter((a: any) => a.parent_agency_id));
      setLoading(false);
    });
  }, []);

  const handleSendInvite = async () => {
    if (!email) return;
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/v1/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitee_email: email }),
      });
      const body = await res.json();
      if (res.ok) {
        setInvites((prev) => [body.data, ...prev]);
        setEmail("");
        setSuccess("Invite sent!");
        showToast("Invite sent!", "success");
      } else {
        setError(body.message ?? "Failed to send invite");
        showToast(body.message ?? "Failed to send invite", "error");
      }
    } catch {
      setError("Network error");
      showToast("Network error", "error");
    } finally {
      setSending(false);
    }
  };

  const handleCreateSub = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agencies/sub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: subName, slug: subSlug, commission_rate: subCommission }),
      });
      const body = await res.json();
      if (res.ok) {
        setSubAgencies((prev) => [...prev, body.data]);
        setShowCreateSub(false);
        setSubName("");
        setSubSlug("");
        setSuccess("Sub-agency created!");
        showToast("Sub-agency created!", "success");
      } else {
        setError(body.message ?? "Failed to create sub-agency");
        showToast(body.message ?? "Failed to create sub-agency", "error");
      }
    } catch {
      setError("Network error");
      showToast("Network error", "error");
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> AGENT / RECRUIT</p>
          <h1>Recruit</h1>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success" style={{ color: "var(--acid)" }}>{success}</p>}

      <div className="card">
        <h2>Sub-Agencies</h2>
        {subAgencies.length === 0 ? (
          <p className="text-muted">No sub-agencies yet.</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Slug</th><th>Commission</th></tr></thead>
            <tbody>
              {subAgencies.map((a) => (
                <tr key={a.id}><td>{a.name}</td><td>{a.slug}</td><td>{a.commission_rate}%</td></tr>
              ))}
            </tbody>
          </table>
        )}
        <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => setShowCreateSub(!showCreateSub)}>
          {showCreateSub ? "Cancel" : "Create Sub-Agency"}
        </button>
        {showCreateSub && (
          <div className="stack" style={{ gap: 8, marginTop: 8 }}>
            <input className="input" placeholder="Agency name" value={subName} onChange={(e) => setSubName(e.target.value)} />
            <input className="input" placeholder="slug-name" value={subSlug} onChange={(e) => setSubSlug(e.target.value)} />
            <label className="label">Commission Rate (%)</label>
            <input className="input" type="number" min={0} max={100} value={subCommission} onChange={(e) => setSubCommission(Number(e.target.value))} />
            <button className="btn btn-primary btn-sm" onClick={handleCreateSub} disabled={sending || !subName || !subSlug}>Create</button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Send Invite</h2>
        <div className="filter-bar">
          <input className="input" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={handleSendInvite} disabled={sending || !email}>{sending ? "Sending..." : "Send Invite"}</button>
        </div>
      </div>

      <div className="card">
        <h2>Invites Sent ({invites.length})</h2>
        {invites.length === 0 ? (
          <p className="text-muted">No invites sent yet.</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>Email</th><th>Status</th><th>Link</th><th>Date</th></tr></thead>
            <tbody>
              {invites.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.invitee_email}</td>
                  <td><span className={`badge${inv.status === "accepted" ? " badge-success" : ""}`}>{inv.status}</span></td>
                  <td className="text-mono-sm" style={{ fontSize: 10 }}>{origin}/register?invite={inv.token}</td>
                  <td className="text-mono-sm">{new Date(inv.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
