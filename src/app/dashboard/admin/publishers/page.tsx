"use client";

import { useState, useEffect, useCallback } from "react";
import { showToast } from "@/lib/use-toast";

interface Publisher {
  id: string;
  name: string;
  email: string | null;
  afid: string | null;
  commission_pct: number;
  fixed_price_cents: number | null;
  retreaver_status: string;
  active: boolean;
  user_id: string | null;
  created_at: string;
}

interface ReportRow {
  publisher_id: string | null;
  publisher_name: string | null;
  calls: string;
  connected_calls: string;
  payout_cents: string;
  campaign_revenue_cents: string;
}

interface ReportResponse {
  rows: ReportRow[];
  totals: { calls: number; connected_calls: number; payout_cents: number; campaign_revenue_cents: number };
}

export default function AdminPublishersPage() {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [afid, setAfid] = useState("");
  const [commission, setCommission] = useState("0");
  const [fixedPrice, setFixedPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingCampaigns, setSyncingCampaigns] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connection, setConnection] = useState<{ configured: boolean; ok: boolean; latency_ms: number | null; message: string } | null>(null);
  const [error, setError] = useState("");

  const fetchPublishers = useCallback(async () => {
    const res = await fetch("/api/v1/publishers");
    if (res.ok) {
      const body = await res.json();
      setPublishers(body.data ?? []);
    }
    setLoading(false);
  }, []);

  const fetchReport = useCallback(async () => {
    const res = await fetch("/api/v1/retreaver/report");
    if (res.ok) {
      const body = await res.json();
      setReport(body.data ?? { rows: [], totals: { calls: 0, connected_calls: 0, payout_cents: 0, campaign_revenue_cents: 0 } });
    }
  }, []);

  useEffect(() => {
    fetchPublishers();
    fetchReport();
    checkConnection();
  }, [fetchPublishers, fetchReport]);

  async function checkConnection() {
    setChecking(true);
    try {
      const res = await fetch("/api/v1/retreaver/status");
      const body = await res.json();
      setConnection(body.data ?? null);
    } catch {
      setConnection({ configured: false, ok: false, latency_ms: null, message: "Status check failed" });
    }
    setChecking(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/v1/publishers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          afid: afid.trim() || undefined,
          commission_pct: parseInt(commission) || 0,
          fixed_price_cents: fixedPrice ? parseInt(fixedPrice) : undefined,
        }),
      });
      const body = await res.json();
      if (res.ok) {
        setName(""); setEmail(""); setAfid(""); setCommission("0"); setFixedPrice("");
        showToast("Publisher created", "success");
        fetchPublishers();
      } else {
        setError(body.message ?? "Failed to create publisher");
        showToast(body.message ?? "Failed to create publisher", "error");
      }
    } catch {
      setError("Network error");
      showToast("Network error creating publisher", "error");
    }
    setSaving(false);
  }

  async function provision(p: Publisher) {
    const res = await fetch("/api/v1/retreaver/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publisher_id: p.id }),
    });
    const body = await res.json();
    if (res.ok) {
      setPublishers((prev) => prev.map((x) => (x.id === p.id ? body.data : x)));
      showToast(`Provisioned "${p.name}" on Retreaver`, "success");
    } else {
      showToast(body.message ?? "Provisioning failed", "error");
    }
  }

  async function setStatus(p: Publisher, status: "active" | "paused") {
    const res = await fetch(`/api/v1/publishers/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ retreaver_status: status }),
    });
    const body = await res.json();
    if (res.ok) {
      setPublishers((prev) => prev.map((x) => (x.id === p.id ? body.data : x)));
      showToast(status === "paused" ? "Publisher paused" : "Publisher resumed", "success");
    } else {
      showToast(body.message ?? "Failed to update status", "error");
    }
  }

  async function syncCalls() {
    setSyncing(true);
    const res = await fetch("/api/v1/retreaver/sync", { method: "POST" });
    const body = await res.json();
    if (res.ok) {
      const { stored = 0, skipped = 0, truncated = false } = body.data ?? {};
      const parts = [`Synced ${stored} Retreaver calls`];
      if (skipped > 0) parts.push(`skipped ${skipped} unattributed`);
      if (truncated) parts.push("history scan capped (re-run to continue)");
      showToast(parts.join(", "), "success");
      fetchReport();
    } else {
      showToast(body.message ?? "Sync failed", "error");
    }
    setSyncing(false);
  }

  async function syncCampaigns() {
    setSyncingCampaigns(true);
    try {
      const res = await fetch("/api/v1/retreaver/campaigns/sync", { method: "POST" });
      const body = await res.json();
      if (res.ok) {
        const { created = 0, updated = 0 } = body.data ?? {};
        const parts = [`Synced Retreaver campaigns`];
        if (created > 0) parts.push(`${created} created`);
        if (updated > 0) parts.push(`${updated} updated`);
        showToast(parts.join(" — "), "success");
      } else {
        showToast(body.message ?? "Campaign sync failed", "error");
      }
    } catch {
      showToast("Network error syncing campaigns", "error");
    }
    setSyncingCampaigns(false);
  }

  async function toggleActive(p: Publisher) {
    const res = await fetch(`/api/v1/publishers/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    if (res.ok) {
      const body = await res.json();
      setPublishers((prev) => prev.map((x) => (x.id === p.id ? body.data : x)));
      showToast(p.active ? "Publisher disabled" : "Publisher enabled", "success");
    } else {
      showToast("Failed to update publisher", "error");
    }
  }

  async function handleDelete(p: Publisher) {
    if (!confirm(`Delete publisher "${p.name}"? Campaigns referencing it will be unlinked.`)) return;
    const res = await fetch(`/api/v1/publishers/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      setPublishers((prev) => prev.filter((x) => x.id !== p.id));
      showToast("Publisher deleted", "success");
    } else {
      showToast("Failed to delete publisher", "error");
    }
  }

  async function sendInvite(p: Publisher) {
    const res = await fetch(`/api/v1/publishers/${p.id}/invite`, { method: "POST" });
    const body = await res.json();
    if (res.ok) {
      showToast(`Invite emailed to ${p.email ?? "publisher"}`, "success");
      const link = body.data?.link;
      if (link) {
        try {
          await navigator.clipboard.writeText(link);
          showToast("Invite link copied to clipboard as backup", "success");
        } catch {
          showToast(`Invite link: ${link}`, "info");
        }
      }
    } else {
      showToast(body.message ?? "Failed to create invite", "error");
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / PUBLISHERS</p>
          <h1>Publishers</h1>
        </div>
        <div className="stack-h" style={{ gap: 8, alignItems: "center" }}>
          <button className="btn btn-secondary" onClick={checkConnection} disabled={checking}>
            {checking ? <span className="spinner" /> : "Check Retreaver status"}
          </button>
          {connection && (
            <span className={`badge ${connection.ok ? "badge-success" : "badge-danger"}`}>
              {connection.ok
                ? `Connected · ${connection.latency_ms ?? "?"}ms`
                : connection.message}
            </span>
          )}
          <button className="btn btn-secondary" onClick={syncCalls} disabled={syncing}>
            {syncing ? <span className="spinner" /> : "Sync Retreaver calls"}
          </button>
          <button className="btn btn-secondary" onClick={syncCampaigns} disabled={syncingCampaigns}>
            {syncingCampaigns ? <span className="spinner" /> : "Sync Retreaver campaigns"}
          </button>
        </div>
      </div>

      <section className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)" }}>
        <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)", letterSpacing: "-0.03em" }}>Add Publisher</h2>
        <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr auto", gap: "var(--space-3)", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Media" required maxLength={255} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" />
          </div>
          <div className="form-group">
            <label className="form-label">Retreaver afid</label>
            <input className="input" value={afid} onChange={(e) => setAfid(e.target.value)} placeholder="auto on provision" />
          </div>
          <div className="form-group">
            <label className="form-label">Commission %</label>
            <input className="input" type="number" min="0" max="100" value={commission} onChange={(e) => setCommission(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Fixed price / call (¢)</label>
            <input className="input" type="number" min="1" value={fixedPrice} onChange={(e) => setFixedPrice(e.target.value)} placeholder="e.g. 250" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving || !name.trim()}>
            {saving ? <span className="spinner" /> : "Add"}
          </button>
        </form>
        {error && <p className="form-error" style={{ marginTop: 8 }}>{error}</p>}
      </section>

      {loading ? (
        <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : publishers.length === 0 ? (
        <p className="text-muted">No publishers yet. Add your first publisher above.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>afid</th>
              <th>Fixed price</th>
              <th>Commission</th>
              <th>Retreaver</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {publishers.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td className="text-mono-sm">{p.email ?? "—"}</td>
                <td className="text-mono-sm">{p.afid ?? "—"}</td>
                <td className="text-mono-sm">{p.fixed_price_cents ? `$${(p.fixed_price_cents / 100).toFixed(2)}` : "—"}</td>
                <td className="text-mono-sm">{p.commission_pct}%</td>
                <td>
                  <span className={`badge ${p.retreaver_status === "active" ? "badge-success" : p.retreaver_status === "paused" ? "badge-warning" : p.retreaver_status === "error" ? "badge-danger" : ""}`}>
                    {p.retreaver_status}
                  </span>
                </td>
                <td><span className={`badge ${p.active ? "badge-success" : ""}`}>{p.active ? "Active" : "Disabled"}</span></td>
                <td className="text-mono-sm">{new Date(p.created_at).toLocaleDateString()}</td>
                <td>
                  {p.user_id ? (
                    <span className="badge badge-success">Portal linked</span>
                  ) : (
                    <button className="btn btn-sm btn-secondary" onClick={() => sendInvite(p)}>Invite</button>
                  )}
                  {p.retreaver_status === "unprovisioned" && (
                    <button className="btn btn-sm btn-secondary" onClick={() => provision(p)} style={{ marginLeft: 4 }}>Provision</button>
                  )}
                  {p.retreaver_status === "active" && (
                    <button className="btn btn-sm btn-secondary" onClick={() => setStatus(p, "paused")} style={{ marginLeft: 4 }}>Pause</button>
                  )}
                  {p.retreaver_status === "paused" && (
                    <button className="btn btn-sm btn-secondary" onClick={() => setStatus(p, "active")} style={{ marginLeft: 4 }}>Resume</button>
                  )}
                  {p.retreaver_status === "error" && (
                    <button className="btn btn-sm btn-secondary" onClick={() => provision(p)} style={{ marginLeft: 4 }}>Retry</button>
                  )}
                  <button className="btn btn-sm btn-secondary" onClick={() => toggleActive(p)} style={{ marginLeft: 4 }}>{p.active ? "Disable" : "Enable"}</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p)} style={{ marginLeft: 4 }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <section className="card" style={{ padding: "var(--space-6)", marginTop: "var(--space-5)" }}>
        <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-2)", letterSpacing: "-0.03em" }}>Retreaver Performance</h2>
        <p className="text-muted" style={{ margin: "0 0 var(--space-4)" }}>
          Finished calls from the Retreaver sync. Margin = call revenue (from Retreaver) − publisher payout.
        </p>
        {!report || report.rows.length === 0 ? (
          <p className="text-muted">No synced calls yet. Run "Sync Retreaver calls" or wait for the scheduled sync.</p>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Publisher</th>
                  <th>Calls</th>
                  <th>Connected</th>
                  <th>Payout</th>
                  <th>Campaign revenue</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => {
                  const payout = parseInt(r.payout_cents ?? "0", 10);
                  const revenue = parseInt(r.campaign_revenue_cents ?? "0", 10);
                  const margin = revenue - payout;
                  return (
                    <tr key={r.publisher_id ?? "unassigned"}>
                      <td>{r.publisher_name ?? "Unassigned"}</td>
                      <td className="text-mono-sm">{r.calls}</td>
                      <td className="text-mono-sm">{r.connected_calls}</td>
                      <td className="text-mono-sm">${(payout / 100).toFixed(2)}</td>
                      <td className="text-mono-sm">${(revenue / 100).toFixed(2)}</td>
                      <td className={`text-mono-sm ${margin < 0 ? "text-danger" : ""}`}>${(margin / 100).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="stack" style={{ marginTop: "var(--space-4)" }}>
              <p className="text-muted">
                Totals — calls: <strong>{report.totals.calls}</strong>, connected: <strong>{report.totals.connected_calls}</strong>, payout:{" "}
                <strong>${(report.totals.payout_cents / 100).toFixed(2)}</strong>, revenue:{" "}
                <strong>${(report.totals.campaign_revenue_cents / 100).toFixed(2)}</strong>, margin:{" "}
                <strong className={report.totals.campaign_revenue_cents - report.totals.payout_cents < 0 ? "text-danger" : ""}>
                  ${((report.totals.campaign_revenue_cents - report.totals.payout_cents) / 100).toFixed(2)}
                </strong>
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
