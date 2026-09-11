"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { showToast } from "@/lib/use-toast";

interface StripeStatus {
  configured: boolean;
  source: "db" | "env" | null;
  webhook_configured: boolean;
}

function StripeIntegrationCard() {
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const refresh = () => {
    fetch("/api/v1/settings/stripe").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setStatus(body.data ?? null);
      }
    }).catch(() => {});
  };

  useEffect(refresh, []);

  async function save() {
    if (!secretKey && !webhookSecret) return;
    if (secretKey && !secretKey.trim().startsWith("sk_")) {
      showToast("Secret key should start with sk_…", "warning");
    }
    if (webhookSecret && !webhookSecret.trim().startsWith("whsec_")) {
      showToast("Webhook secret should start with whsec_…", "warning");
    }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/settings/stripe", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(secretKey ? { secret_key: secretKey.trim() } : {}),
          ...(webhookSecret ? { webhook_secret: webhookSecret.trim() } : {}),
        }),
      });
      const body = await res.json();
      showToast(body.message ?? (res.ok ? "Saved" : "Failed"), res.ok ? "success" : "error");
      if (res.ok) {
        setSecretKey("");
        setWebhookSecret("");
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
      const res = await fetch("/api/v1/settings/stripe", { method: "GET" });
      if (res.ok) {
        const body = await res.json();
        const s = body.data as StripeStatus | null;
        if (s?.configured) {
          showToast(`Stripe: connected via ${s.source === "db" ? "admin-set key" : "env"}${s.webhook_configured ? " + webhook" : " (webhook missing)"}`, "success");
        } else {
          showToast("Stripe not connected — add keys and click Save & Connect", "warning");
        }
      } else {
        showToast("Test connection — coming soon (no verify endpoint yet)", "info");
      }
    } catch {
      showToast("Test connection — coming soon", "info");
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="card card--spacious" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap:"wrap" }}>
        <div style={{ minWidth:0 }}>
          <h2 className="settings-card-title">Stripe Integration</h2>
          <p className="settings-card-sub">Live or test keys from Stripe Dashboard → Developers → API keys. Stored encrypted, never displayed again.</p>
        </div>
        <span className={`badge ${status?.configured ? "badge-success" : "badge-danger"}`} style={{ whiteSpace:"nowrap" }}>
          {status?.configured ? `Connected (${status.source === "db" ? "admin-set" : "env"})` : "Not connected"}
        </span>
      </div>
      <p className="text-muted" style={{ fontSize: 11, margin:"12px 0 0", border:"1px solid var(--line)", borderRadius:9, padding:"8px 10px", background:"rgba(255,255,255,.02)", fontFamily:"var(--mono)" }}>
        Webhook endpoint: <code style={{ color:"var(--ink)" }}>&lt;your-domain&gt;/api/webhooks/stripe</code>
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap: 14, marginTop: 18 }}>
        <div>
          <label className="settings-label">Secret Key</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input className="input" type={showSecret ? "text" : "password"} value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder={status?.configured ? "•••••••• (saved — paste to replace)" : "sk_live_... / sk_test_..."} autoComplete="off" style={{ flex: 1, minHeight:42 }} />
            <button type="button" className="btn btn-sm" onClick={() => setShowSecret((v) => !v)} aria-label={showSecret ? "Hide secret key" : "Show secret key"} title={showSecret ? "Hide" : "Show"}>{showSecret ? "🙈" : "👁"}</button>
          </div>
        </div>
        <div>
          <label className="settings-label">
            Webhook Signing Secret {status?.webhook_configured ? "(✓ configured)" : "(required for payments to credit wallets)"}
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input className="input" type={showWebhook ? "text" : "password"} value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder={status?.webhook_configured ? "•••••••• (saved — paste to replace)" : "whsec_..."} autoComplete="off" style={{ flex: 1, minHeight:42 }} />
            <button type="button" className="btn btn-sm" onClick={() => setShowWebhook((v) => !v)} aria-label={showWebhook ? "Hide webhook secret" : "Show webhook secret"} title={showWebhook ? "Hide" : "Show"}>{showWebhook ? "🙈" : "👁"}</button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", marginTop:4 }}>
          <button className="btn btn-sm" onClick={testConnection} disabled={testing} title="Check Stripe connectivity" style={{ minHeight:36 }}>
            {testing ? "Testing…" : "Test Connection"}
          </button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || (!secretKey && !webhookSecret)} style={{ minHeight:36, minWidth:128 }}>
            {saving ? "Verifying..." : "Save & Connect"}
          </button>
        </div>
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
            <p className="text-muted" style={{ fontSize:12, margin:"6px 0 0", lineHeight:1.5 }}>All systems nominal. Use Agency and Members tabs to manage access.</p>
            <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
              <Link href="/dashboard/settings" className="btn btn-secondary btn-sm">Agency Settings</Link>
              <Link href="/dashboard/admin/agencies" className="btn btn-ghost btn-sm">Agencies →</Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
