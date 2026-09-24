"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { showToast } from "@/lib/use-toast";

interface StripeStatus {
  configured: boolean;
  source: "db" | "env" | null;
  webhook_configured: boolean;
  mode: "test" | "live" | null;
  test_configured: boolean;
  live_configured: boolean;
  active_key_mode: "test" | "live" | null;
}

function KeyInput({ label, value, onChange, placeholder, configuredNote }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  configuredNote: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="settings-label">{label} {configuredNote ? <span className="text-muted">({configuredNote})</span> : null}</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input className="input" type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" style={{ flex: 1, minHeight: 42 }} />
        <button type="button" className="btn btn-sm" onClick={() => setShow((v) => !v)} aria-label={show ? `Hide ${label}` : `Show ${label}`} title={show ? "Hide" : "Show"}>{show ? "🙈" : "👁"}</button>
      </div>
    </div>
  );
}

function StripeIntegrationCard() {
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [mode, setMode] = useState<"test" | "live">("test");
  const [testSecret, setTestSecret] = useState("");
  const [testWebhook, setTestWebhook] = useState("");
  const [liveSecret, setLiveSecret] = useState("");
  const [liveWebhook, setLiveWebhook] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  // Null = never verified this session. The badge is green ONLY after a live
  // API ping succeeds — key presence alone is not proof of connectivity.
  const [verified, setVerified] = useState<boolean | null>(null);

  const refresh = () => {
    fetch("/api/v1/settings/stripe").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setStatus(body.data ?? null);
        if (body.data?.mode === "test" || body.data?.mode === "live") setMode(body.data.mode);
      }
    }).catch(() => {});
  };

  useEffect(refresh, []);

  async function save() {
    const payload: Record<string, string> = { mode };
    if (testSecret.trim()) payload.test_secret_key = testSecret.trim();
    if (testWebhook.trim()) payload.test_webhook_secret = testWebhook.trim();
    if (liveSecret.trim()) payload.live_secret_key = liveSecret.trim();
    if (liveWebhook.trim()) payload.live_webhook_secret = liveWebhook.trim();
    for (const [k, v] of Object.entries(payload)) {
      if (k === "mode") continue;
      if (k.endsWith("secret_key") && !v.startsWith("sk_")) {
        showToast("Secret keys should start with sk_…", "warning");
        return;
      }
      if (k.endsWith("webhook_secret") && !v.startsWith("whsec_")) {
        showToast("Webhook secrets should start with whsec_…", "warning");
        return;
      }
    }
    if (mode === "test" && !status?.test_configured && !payload.test_secret_key) {
      showToast("Paste the test secret key first — nothing to switch to", "warning");
      return;
    }
    if (mode === "live" && !status?.live_configured && !payload.live_secret_key) {
      showToast("Paste the live secret key first — nothing to switch to", "warning");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/settings/stripe", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      showToast(body.message ?? (res.ok ? "Saved" : "Failed"), res.ok ? "success" : "error");
      if (res.ok) {
        setTestSecret("");
        setTestWebhook("");
        setLiveSecret("");
        setLiveWebhook("");
        // PUT verifies server-side; adopt the result (null = unverified).
        setVerified(body.data?.verified === true ? true : body.data?.verified === false ? false : null);
        refresh();
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/v1/settings/stripe", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.data?.verified) {
        setVerified(true);
        showToast(`Stripe verified — ${body.data?.mode === "live" ? "LIVE" : body.data?.mode === "test" ? "TEST" : ""} API responded`.trim(), "success");
      } else {
        setVerified(false);
        showToast(body.message ?? "Stripe verification failed — check the key", "error");
      }
    } catch {
      setVerified(false);
      showToast("Network error verifying Stripe", "error");
    } finally {
      setTesting(false);
    }
  }

  const badge = verified === true
    ? { cls: "badge-success", text: `${mode === "live" ? "Live" : "Test"} mode — verified` }
    : status?.configured
      ? { cls: "badge-danger", text: "Keys saved — not verified" }
      : { cls: "badge-danger", text: "Not connected" };

  return (
    <section className="card card--spacious" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h2 className="settings-card-title">Stripe Integration</h2>
          <p className="settings-card-sub">Test and live keys from Stripe Dashboard → Developers → API keys. Stored encrypted, never displayed again. Switching mode activates that pair everywhere instantly.</p>
        </div>
        <span className={`badge ${badge.cls}`} style={{ whiteSpace: "nowrap" }} title={verified === true ? "API ping succeeded in the active mode" : "Not verified against the Stripe API"}>
          {badge.text}
        </span>
      </div>

      {/* Mode switcher */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
        <span className="text-muted" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>MODE</span>
        <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 9999, border: "1px solid var(--line)", background: "rgba(255,255,255,0.03)" }} role="tablist" aria-label="Stripe mode">
          {(["test", "live"] as const).map((m) => {
            const active = mode === m;
            const configured = m === "test" ? status?.test_configured : status?.live_configured;
            const current = status?.mode === m;
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(m)}
                title={m === "test" ? "Stripe test mode — no real charges" : "Stripe live mode — REAL charges"}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8, border: 0, cursor: "pointer", borderRadius: 9999,
                  padding: "8px 16px", fontSize: 12, fontWeight: active ? 700 : 500,
                  color: active ? "#fff" : "var(--muted)",
                  background: active ? (m === "live" ? "linear-gradient(135deg, #059669, #10B981)" : "linear-gradient(135deg, #D97706, #F59E0B)") : "transparent",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: configured ? "var(--green)" : "var(--muted)" }} />
                {m === "test" ? "Test" : "Live"}
                {current ? <span style={{ fontSize: 9, opacity: 0.85 }}>(active)</span> : null}
              </button>
            );
          })}
        </div>
        {mode === "live" && (
          <span className="badge badge-danger" style={{ fontSize: 10 }}>REAL charges in live mode</span>
        )}
      </div>

      <p className="text-muted" style={{ fontSize: 11, margin: "12px 0 0", border: "1px solid var(--line)", borderRadius: 9, padding: "8px 10px", background: "rgba(255,255,255,.02)", fontFamily: "var(--mono)" }}>
        Webhook endpoint: <code style={{ color: "var(--ink)" }}>&lt;your-domain&gt;/api/webhooks/stripe</code>
        <span style={{ display: "block", marginTop: 6, fontFamily: "var(--sans)" }}>Localhost testing: run <code style={{ color: "var(--ink)" }}>stripe listen --forward-to localhost:30001/api/webhooks/stripe</code> — it prints a <code style={{ color: "var(--ink)" }}>whsec_…</code> secret; paste it as the Test webhook secret above.</span>
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 14, border: "1px solid var(--line)", borderRadius: 12, background: mode === "test" ? "rgba(245,158,11,0.05)" : "transparent" }}>
          <strong style={{ fontSize: 12 }}>Test keys <span className="text-muted" style={{ fontWeight: 400 }}>— no real charges</span></strong>
          <KeyInput label="Test secret key" value={testSecret} onChange={setTestSecret} placeholder={status?.test_configured ? "•••••••• (saved)" : "sk_test_..."} configuredNote={status?.test_configured ? "saved" : ""} />
          <KeyInput label="Test webhook secret" value={testWebhook} onChange={setTestWebhook} placeholder="whsec_... (from stripe listen)" configuredNote="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 14, border: "1px solid var(--line)", borderRadius: 12, background: mode === "live" ? "rgba(16,185,129,0.05)" : "transparent" }}>
          <strong style={{ fontSize: 12 }}>Live keys <span className="text-muted" style={{ fontWeight: 400 }}>— real charges</span></strong>
          <KeyInput label="Live secret key" value={liveSecret} onChange={setLiveSecret} placeholder={status?.live_configured ? "•••••••• (saved)" : "sk_live_..."} configuredNote={status?.live_configured ? "saved" : ""} />
          <KeyInput label="Live webhook secret" value={liveWebhook} onChange={setLiveWebhook} placeholder="whsec_... (from Stripe dashboard)" configuredNote="" />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        <button className="btn btn-sm" onClick={testConnection} disabled={testing} title="Check Stripe connectivity in the active mode" style={{ minHeight: 36 }}>
          {testing ? "Testing…" : "Test Connection"}
        </button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving} style={{ minHeight: 36, minWidth: 128 }} title={`Save keys and switch to ${mode} mode`}>
          {saving ? "Verifying..." : `Save & Use ${mode === "test" ? "Test" : "Live"}`}
        </button>
      </div>
    </section>
  );
}
export default function AdminSystemSettingsPage() {
  const [allowCreation, setAllowCreation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/v1/settings/system").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setAllowCreation(body.data?.allow_agent_agency_creation ?? false);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/settings/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allow_agent_agency_creation: allowCreation }),
      });
      if (res.ok) {
        showToast("System settings saved", "success");
      } else {
        const body = await res.json().catch(() => ({}));
        showToast(body.message ?? "Failed to save", "error");
      }
    } catch {
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  return (
    <div className="dashboard-page cc-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / SYSTEM</p>
          <h1 style={{ margin:"8px 0 0" }}>System Settings</h1>
          <p className="text-muted" style={{ fontSize:13, margin:"6px 0 0", maxWidth:560 }}>Stripe, agency creation and platform toggles — grouped for one-glance control.</p>
        </div>
      </div>

      <div className="settings-layout">
        <div style={{ display:"flex", flexDirection:"column", gap:"var(--space-6)" }}>
          <StripeIntegrationCard />
          <section className="card card--spacious" style={{ padding:22 }}>
            <h2 className="settings-card-title">Security & Data</h2>
            <p className="settings-card-sub">Retention and encryption are managed centrally. Contact ops for rotation.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", border:"1px solid var(--line)", borderRadius:10, background:"rgba(255,255,255,.02)" }}>
                <div>
                  <strong style={{ fontSize:13, color:"var(--ink)" }}>Recording encryption</strong>
                  <p className="text-muted" style={{ fontSize:11, margin:"2px 0 0" }}>AES-256 at rest — managed by platform</p>
                </div>
                <span className="badge badge-success">Enabled</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", border:"1px solid var(--line)", borderRadius:10, background:"rgba(255,255,255,.02)" }}>
                <div>
                  <strong style={{ fontSize:13, color:"var(--ink)" }}>Webhook retries</strong>
                  <p className="text-muted" style={{ fontSize:11, margin:"2px 0 0" }}>Automatic retry with idempotency</p>
                </div>
                <span className="badge badge-info">3×</span>
              </div>
            </div>
          </section>
        </div>

        <aside className="settings-rail">
          <section className="card card--spacious" style={{ padding:18 }}>
            <h2 className="settings-card-title" style={{ fontSize:14 }}>Agent agency creation</h2>
            <p className="settings-card-sub">When enabled, agents without an agency can create their own agency and become its head.</p>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginTop:14, padding:"14px", border:"1px solid var(--line)", borderRadius:10, background:"rgba(255,255,255,.02)" }}>
              <div>
                <strong style={{ fontSize:13, color:"var(--ink)" }}>{allowCreation ? "Enabled" : "Disabled"}</strong>
                <p className="text-muted" style={{ fontSize:11, margin:"4px 0 0", lineHeight:1.5 }}>{allowCreation ? "Agents can self-create agencies." : "Only invite via admin."}</p>
              </div>
              <label className="toggle" style={{ flexShrink:0 }}>
                <input
                  type="checkbox"
                  checked={allowCreation}
                  onChange={(e) => setAllowCreation(e.target.checked)}
                />
                <span>{allowCreation ? "On" : "Off"}</span>
              </label>
            </div>
            <div style={{ marginTop:14, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={{ minWidth:110, minHeight:36 }}>
                {saving ? <span className="spinner" /> : "Save setting"}
              </button>
            </div>
            <p className="text-muted" style={{ fontSize:11, margin:"10px 0 0", lineHeight:1.5 }}>Heads manage members via Settings → Members. Change takes effect immediately.</p>
          </section>

          <section className="card" style={{ padding:16, background:"linear-gradient(135deg, rgba(168,85,247,.10), rgba(255,255,255,.02))", borderColor:"rgba(168,85,247,.16)" }}>
            <h3 style={{ font:"600 13px var(--sans)", margin:0, color:"var(--ink)" }}>Platform health</h3>
            <p className="text-muted" style={{ fontSize:12, margin:"6px 0 0", lineHeight:1.5 }}>All systems nominal. Platform controls live here; agency setup under Agencies, members under Users.</p>
            <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
              <Link href="/dashboard/admin/users" className="btn btn-secondary btn-sm">Users</Link>
              <Link href="/dashboard/admin/agencies" className="btn btn-ghost btn-sm">Agencies →</Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
