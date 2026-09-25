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
      <h2 className="settings-card-title" style={{ fontSize: 14, letterSpacing:"-0.02em" }}>Quick Links</h2>
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
  // Server role from /api/v1/me: admin is platform-level (not agency-scoped)
  // and gets a dedicated platform view below — never the agency tabs.
  const [meRole, setMeRole] = useState<string | null>(null);
  // Tracking-number assignment is head-managed infra: plain agents don't
  // get the Phone Numbers tab (the page itself shows them a notice).
  const [isHead, setIsHead] = useState<boolean | null>(null);
  // Registration approval: agency creation unlocks only once approved.
  const [myApproval, setMyApproval] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/me").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        // Mirror the dashboard layout: an explicit publisher linkage wins over
        // a stale session role string.
        if (body.data?.publisherId || body.data?.publisher?.id) setMeRole("publisher");
        else setMeRole(body.data?.user?.role ?? null);
        setIsHead(body.data?.isHead === true);
        if (body.data?.agentId) {
          fetch(`/api/v1/agents/${body.data.agentId}`).then(async (ar) => {
            if (ar.ok) {
              const ab = await ar.json();
              setMyApproval(ab.data?.approval_status ?? null);
            }
          }).catch(() => {});
        } else {
          setMyApproval(null);
        }
      } else {
        setMeRole(null);
      }
    }).catch(() => setMeRole(null));
    fetch("/api/v1/agency").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        if (body.data) {
          setAgency(body.data);
        }
      }
      setLoading(false);
    });
  }, []);

  const [creationAllowed, setCreationAllowed] = useState<boolean | null>(null);
  const [newAgencyName, setNewAgencyName] = useState("");
  const [newAgencySlug, setNewAgencySlug] = useState("");
  const [creating, setCreating] = useState(false);
  // Phase 3 (point 6): explicit leave-and-create confirmation for members.
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [platformSaving, setPlatformSaving] = useState(false);

  useEffect(() => {
    fetch("/api/v1/settings/system").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setCreationAllowed(body.data?.allow_agent_agency_creation ?? false);
      }
    }).catch(() => setCreationAllowed(false));
  }, []);

  async function handleCreateAgency(e: React.FormEvent, leave = false) {
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
          ...(leave ? { leaveAgency: true } : {}),
        }),
      });
      const body = await res.json();
      if (res.ok) {
        showToast("Agency created — you are now the head", "success");
        setAgency(body.data);
        setLeaveConfirm(false);
        setNewAgencyName("");
        setNewAgencySlug("");
      } else {
        showToast(body.message ?? "Failed to create agency", "error");
      }
    } catch {
      showToast("Network error creating agency", "error");
    }
    setCreating(false);
  }

  if (loading || meRole === null) return (
    <div className="dashboard-page" style={{ overflowX: "auto" }}>
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  // Admin is platform-level, not agency-scoped: platform controls only, no
  // Agency/Members/Phone tabs and no agency-profile editing on this page.
  if (meRole === "admin") {
    async function handlePlatformSave(next: boolean) {
      setPlatformSaving(true);
      try {
        const res = await fetch("/api/v1/settings/system", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allow_agent_agency_creation: next }),
        });
        if (res.ok) {
          setCreationAllowed(next);
          showToast("System settings saved", "success");
        } else {
          const body = await res.json().catch(() => ({}));
          showToast(body.message ?? "Failed to save", "error");
        }
      } catch {
        showToast("Failed to save", "error");
      } finally {
        setPlatformSaving(false);
      }
    }

    return (
      <div className="dashboard-page cc-page">
        <div className="dashboard-page-header">
          <div>
            <p className="eyebrow"><i /> SETTINGS / PLATFORM</p>
            <h1 style={{ margin: "8px 0 0" }}>Platform Settings</h1>
            <p className="text-muted" style={{ fontSize: 13, margin: "6px 0 0", maxWidth: 560 }}>Platform-level controls. Agency setup lives under Admin → Agencies; member management under Admin → Users.</p>
          </div>
        </div>

        <div className="settings-layout">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <section className="card card--spacious" style={{ padding: 22 }}>
              <h2 className="settings-card-title">Agency Creation</h2>
              <p className="settings-card-sub">When enabled, agents without an agency can create their own agency and become its head.</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 14, padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "rgba(255,255,255,.02)" }}>
                <div>
                  <strong style={{ fontSize: 13, color: "var(--ink)", display: "block" }}>{creationAllowed ? "Allowed" : creationAllowed === null ? "Checking…" : "Disabled"}</strong>
                  <small style={{ fontSize: 11, color: "var(--muted)" }}>{creationAllowed ? "Agents may create agencies" : "Admin-only creation"}</small>
                </div>
                <label className="toggle" style={{ flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={creationAllowed === true}
                    disabled={creationAllowed === null || platformSaving}
                    onChange={(e) => handlePlatformSave(e.target.checked)}
                  />
                  <span>{creationAllowed ? "On" : "Off"}</span>
                </label>
              </div>
            </section>

            <section className="card card--spacious" style={{ padding: 22 }}>
              <h2 className="settings-card-title">Full System Settings</h2>
              <p className="settings-card-sub">Stripe keys, retention, encryption and webhook retries.</p>
              <Link href="/dashboard/admin/settings" className="btn btn-secondary btn-sm" style={{ marginTop: 14 }}>Open System Settings →</Link>
            </section>
          </div>

          <aside className="settings-rail">
            <section className="card card--spacious" style={{ padding: 18 }}>
              <h2 className="settings-card-title" style={{ fontSize: 14, letterSpacing: "-0.02em" }}>Platform Links</h2>
              <p className="settings-card-sub">Admin consoles for people and agencies.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                {[
                  { label: "Users", href: "/dashboard/admin/users", note: "Memberships, roles, suspend / activate" },
                  { label: "Agencies", href: "/dashboard/admin/agencies", note: "Create, edit, delete agencies" },
                  { label: "System Settings", href: "/dashboard/admin/settings", note: "Stripe + platform toggles" },
                ].map((l) => (
                  <Link key={l.href} href={l.href} className="clickable" style={{ display: "block", padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "rgba(255,255,255,0.02)" }}>
                    <strong style={{ fontSize: 13, color: "var(--ink)" }}>{l.label}</strong>
                    <p className="text-muted" style={{ fontSize: 11, margin: "4px 0 0" }}>{l.note}</p>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page cc-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> SETTINGS / AGENCY</p>
          <h1 style={{ margin:"8px 0 0" }}>Settings</h1>
          <p className="text-muted" style={{ fontSize:13, margin:"6px 0 0", maxWidth:560 }}>Agency creation — start your own agency as head. Profile edits live with the platform admin.</p>
        </div>
      </div>
      <nav className="tabs" style={{ marginBottom: "var(--space-2)" }}>
        <Link className="tab active" href="/dashboard/settings">Agency</Link>
        <Link className="tab" href="/dashboard/settings/members">Members</Link>
        {isHead && <Link className="tab" href="/dashboard/settings/phone-numbers">Phone Numbers</Link>}
      </nav>

      <div className="settings-layout">
        {/* LEFT 2/3 — agency creation only. Editing the current agency
            (name, retention) lives with the platform admin — one card here
            keeps agents from confusing "edit mine" with "start new". */}
        <div style={{ display:"flex", flexDirection:"column", gap: "var(--space-4)" }}>
          {agency ? (
            <>
            <section className="card card--spacious" style={{ padding:18 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <span className="badge badge-success" style={{ textTransform:"capitalize" }}>{agency.status}</span>
                <div>
                  <strong style={{ fontSize:14, color:"var(--ink)", display:"block" }}>{agency.name}</strong>
                  <small style={{ fontSize:11, color:"var(--muted)" }}>Your current agency — profile edits live with the platform admin</small>
                </div>
              </div>
            </section>
            {creationAllowed && myApproval !== "approved" && myApproval !== null && (
              <section className="card card--spacious" style={{ padding:22 }}>
                <h2 className="settings-card-title" style={{ fontSize:15 }}>Awaiting approval</h2>
                <p className="text-muted" style={{ fontSize: 13, margin:"8px 0 0", lineHeight:1.6 }}>
                  Your registration is <strong style={{ color:"var(--ink)" }}>{myApproval}</strong>. Starting a new agency unlocks once approved.
                </p>
              </section>
            )}
            {creationAllowed && (myApproval === "approved" || myApproval === null) && (
              <section className="card card--spacious" style={{ padding:22, borderColor:"rgba(239,68,68,.25)" }}>
                <h2 className="settings-card-title">Start a New Agency</h2>
                <p className="settings-card-sub">Leave {agency.name} and create your own agency as head. Your calls and payouts stay with {agency.name} — only your membership moves.</p>
                <form onSubmit={(e) => handleCreateAgency(e, true)} className="settings-form">
                  <div>
                    <label className="settings-label">New Agency Name</label>
                    <input className="input" value={newAgencyName} onChange={(e) => setNewAgencyName(e.target.value)} placeholder="e.g. Northside Insurance" required maxLength={255} style={{ minHeight: 42 }} />
                  </div>
                  <label style={{ display:"flex", gap:8, alignItems:"flex-start", fontSize:12, color:"var(--muted)", cursor:"pointer" }}>
                    <input type="checkbox" checked={leaveConfirm} onChange={(e) => setLeaveConfirm(e.target.checked)} style={{ marginTop:3 }} />
                    I understand I am leaving {agency.name} and cannot undo this myself
                  </label>
                  <button className="btn btn-primary" type="submit" disabled={creating || !newAgencyName.trim() || !leaveConfirm} style={{ height: 42 }}>
                    {creating ? <span className="spinner" /> : "Leave & Create Agency"}
                  </button>
                </form>
              </section>
            )}
            {creationAllowed === false && (
              <section className="card card--spacious" style={{ padding:22 }}>
                <h2 className="settings-card-title" style={{ fontSize:15 }}>No actions available</h2>
                <p className="text-muted" style={{ fontSize: 13, margin:"8px 0 0", lineHeight:1.6 }}>
                  Agency creation is currently disabled — contact the platform admin if you need changes to {agency.name}.
                </p>
                <Link href="/dashboard/support" className="btn btn-secondary btn-sm" style={{ marginTop:16 }}>Contact Support →</Link>
              </section>
            )}
            </>
          ) : creationAllowed === null ? (
            <div className="card card--spacious" style={{ padding:22 }}>
              <div className="skeleton skeleton-text" />
            </div>
          ) : myApproval !== null && myApproval !== "approved" ? (
            <section className="card card--spacious" style={{ padding:22 }}>
              <h2 className="settings-card-title" style={{ fontSize:15 }}>Awaiting approval</h2>
              <p className="text-muted" style={{ fontSize: 13, margin:"8px 0 0", lineHeight:1.6 }}>
                Your registration is <strong style={{ color:"var(--ink)" }}>{myApproval}</strong>. An admin reviews every signup — you can create an agency once approved.
              </p>
              <Link href="/dashboard/support" className="btn btn-secondary btn-sm" style={{ marginTop:16 }}>Contact Support →</Link>
            </section>
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
            {/* Admin-only console: agents see the read-only status above. No link here —
                /dashboard/admin/* redirects non-admins away, so linking it would dead-end. */}
          </section>

          <section className="card" style={{ padding:16, background:"linear-gradient(135deg, rgba(168,85,247,.12), rgba(255,255,255,.02))", borderColor:"rgba(168,85,247,.18)" }}>
            <h3 style={{ font:"600 13px var(--sans)", margin:0, color:"var(--ink)" }}>Need help?</h3>
            <p className="text-muted" style={{ fontSize:12, margin:"6px 0 0", lineHeight:1.5 }}>Manage members and agency setup from the tabs above.{isHead ? " Heads can also attach phone numbers to campaigns." : ""}</p>
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
