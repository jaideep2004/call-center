"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { showToast } from "@/lib/use-toast";
import { US_STATES } from "@/lib/us-states";

interface Agency {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency: string;
  recording_retention_days: number;
  created_at: string;
}

const ROLE_LINKS: Record<string, { label: string; href: string; note: string }[]> = {
  finance: [
    { label: "Agent Fees", href: "/dashboard/admin/fees", note: "Charge or waive Dialer Fee / Software Access" },
    { label: "Revenue", href: "/dashboard/admin/revenue", note: "Paid invoice trends and daily breakdown" },
    { label: "Weekly Invoices", href: "/dashboard/wallet/invoices", note: "Invoices to send to agencies" },
  ],
  manager: [
    { label: "Leads", href: "/dashboard/leads", note: "Assign and review leads (scoped view)" },
    { label: "Calls", href: "/dashboard/calls", note: "Monitor live and historical calls (scoped view)" },
    { label: "Reports", href: "/dashboard/reports", note: "Team performance reports (scoped view)" },
  ],
  agent: [
    { label: "My Wallet", href: "/dashboard/wallet/agent", note: "Balance, top-ups, transactions" },
    { label: "Subscriptions", href: "/dashboard/agents/subscription", note: "Plans and call allowances" },
    { label: "Support", href: "/dashboard/support", note: "Create and track support tickets" },
  ],
};

function RoleShortcuts() {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/me").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setRole(body.data?.user?.role ?? null);
      }
    }).catch(() => {});
  }, []);

  const links = role ? ROLE_LINKS[role] : undefined;
  if (!links || links.length === 0) return null;

  return (
    <section className="card card--spacious" style={{ padding: 18 }}>
      <h2 className="settings-card-title" style={{ fontSize: 14, letterSpacing:"-0.02em" }}>{role === "finance" ? "Finance Settings" : role === "manager" ? "Manager Tools" : "Quick Links"}</h2>
      <p className="settings-card-sub">Shortcuts for your role — grouped for quick access.</p>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:14 }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="clickable" style={{ display: "block", padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "rgba(255,255,255,0.02)" }}>
            <strong style={{ fontSize: 13, color:"var(--ink)" }}>{l.label}</strong>
            <p className="text-muted" style={{ fontSize: 11, margin: "4px 0 0" }}>{l.note}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AgentStatesSection() {
  const [agentId, setAgentId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/me").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setRole(body.data?.user?.role ?? null);
        setAgentId(body.data?.agentId ?? null);
      }
    }).catch(() => {});
  }, []);
  if (role !== "agent") return null;
  return <AgentStatesCard agentId={agentId} />;
}

function AgentStatesCard({ agentId }: { agentId: string | null }) {
  const [states, setStates] = useState<string[]>([]);
  const [draft, setDraft] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    fetch(`/api/v1/agents/${agentId}`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setStates(body.data.states ?? []);
        setDraft(body.data.states ?? []);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [agentId]);

  function toggle(code: string) {
    setDraft((prev) => prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code]);
  }

  async function save() {
    if (!agentId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ states: draft }),
      });
      if (res.ok) {
        const body = await res.json();
        setStates(body.data.states ?? draft);
        setEditing(false);
        showToast("States updated", "success");
      } else {
        const body = await res.json();
        showToast(body.message ?? "Failed to update states", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!agentId) return null;
  if (loading) return <div className="card card--spacious" style={{ padding:18 }}><div className="skeleton skeleton-text" /></div>;

  return (
    <section className="card card--spacious" style={{ padding:18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap:12 }}>
        <div>
          <h2 className="settings-card-title" style={{ fontSize:14 }}>Licensed States</h2>
          <p className="settings-card-sub" style={{ marginTop:4 }}>State-wise routing — leave empty for any.</p>
        </div>
        {!editing && <button className="btn btn-sm btn-secondary" onClick={() => { setDraft([...states]); setEditing(true); }}>Edit</button>}
      </div>
      {editing ? (
        <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:14 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 220, overflowY: "auto", padding: 10, border: "1px solid var(--line)", borderRadius: 10, background:"rgba(255,255,255,.02)" }}>
            {US_STATES.map((s) => (
              <button key={s.code} type="button" className={draft.includes(s.code) ? "badge badge-success" : "badge"} onClick={() => toggle(s.code)} style={{ cursor: "pointer", border: 0, fontFamily: "var(--mono)", fontSize: 10 }} title={s.name}>{s.code}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap:"wrap" }}>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            {draft.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setDraft([])}>Clear all</button>}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop:14 }}>
          {states.length ? states.map((c) => <span key={c} className="badge badge-info" style={{ fontFamily:"var(--mono)", fontSize:11 }}>{c}</span>) : <span className="text-mono-sm" style={{ color: "var(--muted)", fontSize: 11 }}>Any state — no restriction</span>}
        </div>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [retention, setRetention] = useState(90);

  useEffect(() => {
    fetch("/api/v1/agency").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        if (body.data) {
          setAgency(body.data);
          setName(body.data.name);
          setRetention(body.data.recording_retention_days);
        }
      }
      setLoading(false);
    });
  }, []);

  const [creationAllowed, setCreationAllowed] = useState<boolean | null>(null);
  const [newAgencyName, setNewAgencyName] = useState("");
  const [newAgencySlug, setNewAgencySlug] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/v1/settings/system").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setCreationAllowed(body.data?.allow_agent_agency_creation ?? false);
      }
    }).catch(() => setCreationAllowed(false));
  }, []);

  async function handleCreateAgency(e: React.FormEvent) {
    e.preventDefault();
    if (!newAgencyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/agencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAgencyName.trim(),
          slug: newAgencySlug.trim() || newAgencyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        }),
      });
      const body = await res.json();
      if (res.ok) {
        showToast("Agency created — you are now the head", "success");
        setAgency(body.data);
        setName(body.data.name);
        setRetention(body.data.recording_retention_days);
      } else {
        showToast(body.message ?? "Failed to create agency", "error");
      }
    } catch {
      showToast("Network error creating agency", "error");
    }
    setCreating(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/agency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, recording_retention_days: retention }),
      });
      if (res.ok) {
        showToast("Settings saved", "success");
      } else {
        const body = await res.json().catch(() => ({}));
        showToast(body.message ?? "Failed to save settings", "error");
      }
    } catch {
      showToast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="dashboard-page" style={{ overflowX: "auto" }}>
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  return (
    <div className="dashboard-page cc-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> SETTINGS / AGENCY</p>
          <h1 style={{ margin:"8px 0 0" }}>Settings</h1>
          <p className="text-muted" style={{ fontSize:13, margin:"6px 0 0", maxWidth:560 }}>Agency profile, retention and creation controls — your control plane for team setup.</p>
        </div>
      </div>
      <nav className="tabs" style={{ marginBottom: "var(--space-2)" }}>
        <Link className="tab active" href="/dashboard/settings">Agency</Link>
        <Link className="tab" href="/dashboard/settings/members">Members</Link>
        <Link className="tab" href="/dashboard/settings/phone-numbers">Phone Numbers</Link>
      </nav>

      <div className="settings-layout">
        {/* LEFT 2/3 — Agency profile */}
        <div style={{ display:"flex", flexDirection:"column", gap: "var(--space-4)" }}>
          {agency ? (
            <section className="card card--spacious" style={{ padding:22 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                <div>
                  <h2 className="settings-card-title">Agency Profile</h2>
                  <p className="settings-card-sub">Name and retention — saved to your agency record.</p>
                </div>
                <span className="badge badge-success" style={{ textTransform:"capitalize" }}>{agency.status}</span>
              </div>

              <dl className="settings-data" style={{ gridTemplateColumns:"1fr 1fr", marginTop:18 }}>
                <div>
                  <dt>Agency ID</dt>
                  <dd className="text-mono-sm" style={{ fontSize:12 }}>{agency.id}</dd>
                </div>
                <div>
                  <dt>Slug</dt>
                  <dd className="text-mono-sm" style={{ fontSize:12 }}>{agency.slug}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd className="text-mono-sm" style={{ fontSize:12 }}>{agency.created_at ? new Date(agency.created_at).toLocaleDateString() : "—"}</dd>
                </div>
                <div>
                  <dt>Currency</dt>
                  <dd className="text-mono-sm" style={{ fontSize:12 }}>{agency.currency ?? "USD"}</dd>
                </div>
              </dl>

              <div className="settings-form">
                <div>
                  <label className="settings-label">Agency Name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Northside Agency" style={{ minHeight: 42 }} />
                </div>
                <div>
                  <label className="settings-label">Recording Retention (Days)</label>
                  <input className="input" type="number" min={1} max={3650} value={retention} onChange={(e) => setRetention(parseInt(e.target.value) || 90)} style={{ minHeight: 42 }} />
                  <p className="text-muted" style={{ fontSize:11, margin:"6px 0 0" }}>After this period, recordings are purged. 90 days is the default.</p>
                </div>
                <button className="btn btn-primary" disabled={saving} onClick={handleSave} style={{ height: 42, marginTop: 4 }}>{saving ? "Saving..." : "Save Changes"}</button>
              </div>
            </section>
          ) : creationAllowed === null ? (
            <div className="card card--spacious" style={{ padding:22 }}>
              <div className="skeleton skeleton-text" />
            </div>
          ) : creationAllowed ? (
            <section className="card card--spacious" style={{ padding:22 }}>
              <h2 className="settings-card-title">Create Your Agency</h2>
              <p className="settings-card-sub">You don&apos;t belong to an agency yet. Create your own to become the agency head and manage members.</p>
              <form onSubmit={handleCreateAgency} className="settings-form">
                <div>
                  <label className="settings-label">Agency Name</label>
                  <input className="input" value={newAgencyName} onChange={(e) => setNewAgencyName(e.target.value)} placeholder="e.g. Northside Insurance" required maxLength={255} style={{ minHeight: 42 }} />
                </div>
                <div>
                  <label className="settings-label">Slug (Optional)</label>
                  <input className="input" value={newAgencySlug} onChange={(e) => setNewAgencySlug(e.target.value)} placeholder="auto-generated from name" maxLength={100} style={{ minHeight: 42 }} />
                </div>
                <button className="btn btn-primary" type="submit" disabled={creating || !newAgencyName.trim()} style={{ height: 42 }}>
                  {creating ? <span className="spinner" /> : "Create Agency"}
                </button>
              </form>
            </section>
          ) : (
            <section className="card card--spacious" style={{ padding:22 }}>
              <h2 className="settings-card-title" style={{ fontSize:15 }}>No agency yet</h2>
              <p className="text-muted" style={{ fontSize: 13, margin:"8px 0 0", lineHeight:1.6 }}>
                You don&apos;t belong to an agency yet. Agency creation is currently disabled — contact the platform admin to be invited to an existing agency.
              </p>
              <Link href="/dashboard/support" className="btn btn-secondary btn-sm" style={{ marginTop:16 }}>Contact Support →</Link>
            </section>
          )}
        </div>

        {/* RIGHT 1/3 — rail */}
        <aside className="settings-rail">
          <RoleShortcuts />
          <AgentStatesSection />

          <section className="card card--spacious" style={{ padding:18 }}>
            <h2 className="settings-card-title" style={{ fontSize:14 }}>Creation Control</h2>
            <p className="settings-card-sub">Whether agents can create their own agencies.</p>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginTop:14, padding:"12px 14px", border:"1px solid var(--line)", borderRadius:10, background:"rgba(255,255,255,.02)" }}>
              <div>
                <strong style={{ fontSize:13, color:"var(--ink)", display:"block" }}>{creationAllowed ? "Allowed" : creationAllowed===null ? "Checking…" : "Disabled"}</strong>
                <small style={{ fontSize:11, color:"var(--muted)" }}>{creationAllowed ? "Agents may create agencies" : "Admin-only creation"}</small>
              </div>
              <span className={`badge ${creationAllowed ? "badge-success" : "badge-info"}`} style={{ textTransform:"uppercase", fontSize:10 }}>{creationAllowed ? "On" : "Off"}</span>
            </div>
            <Link href="/dashboard/admin/settings" className="btn btn-ghost btn-sm" style={{ marginTop:12, width:"100%", justifyContent:"center" }}>System Settings →</Link>
          </section>

          <section className="card" style={{ padding:16, background:"linear-gradient(135deg, rgba(168,85,247,.12), rgba(255,255,255,.02))", borderColor:"rgba(168,85,247,.18)" }}>
            <h3 style={{ font:"600 13px var(--sans)", margin:0, color:"var(--ink)" }}>Need help?</h3>
            <p className="text-muted" style={{ fontSize:12, margin:"6px 0 0", lineHeight:1.5 }}>Manage members, assign roles and attach phone numbers to campaigns from the tabs above.</p>
            <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
              <Link href="/dashboard/settings/members" className="btn btn-secondary btn-sm">Members</Link>
              <Link href="/dashboard/settings/phone-numbers" className="btn btn-ghost btn-sm">Numbers</Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
