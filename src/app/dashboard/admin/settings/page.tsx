"use client";

import { useState, useEffect } from "react";
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
  const [saving, setSaving] = useState(false);

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

  return (
    <section className="card" style={{ padding: "var(--space-6)", maxWidth: 560 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-2)", letterSpacing: "-0.03em" }}>Stripe Integration</h2>
        <span className={`badge ${status?.configured ? "badge-success" : "badge-danger"}`}>
          {status?.configured ? `Connected (${status.source === "db" ? "admin-set" : "env"})` : "Not connected"}
        </span>
      </div>
      <p className="text-muted" style={{ fontSize: 12 }}>
        Paste your live or test keys from the Stripe Dashboard (Developers → API keys).
        Keys are stored encrypted and never displayed again.
        Webhook endpoint: <code className="text-mono-sm">&lt;your-domain&gt;/api/webhooks/stripe</code>
      </p>
      <div className="stack" style={{ gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
        <label className="text-mono-sm" style={{ fontSize: 10, letterSpacing: 1, color: "var(--muted)" }}>SECRET KEY</label>
        <input className="input" type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder={status?.configured ? "•••••••• (saved — paste to replace)" : "sk_live_... / sk_test_..."} autoComplete="off" />
        <label className="text-mono-sm" style={{ fontSize: 10, letterSpacing: 1, color: "var(--muted)" }}>
          WEBHOOK SIGNING SECRET {status?.webhook_configured ? "(✓ configured)" : "(required for payments to credit wallets)"}
        </label>
        <input className="input" type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder={status?.webhook_configured ? "•••••••• (saved — paste to replace)" : "whsec_..."} autoComplete="off" />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || (!secretKey && !webhookSecret)}>
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
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / SYSTEM</p>
          <h1>System Settings</h1>
        </div>
      </div>

      <StripeIntegrationCard />

      <section className="card" style={{ padding: "var(--space-6)", maxWidth: 560, marginTop: "var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-2)", letterSpacing: "-0.03em" }}>Agent agency creation</h2>
            <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
              When enabled, agents without an agency can create their own agency and become its head.
              The head manages members through Settings → Members.
            </p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={allowCreation}
              onChange={(e) => setAllowCreation(e.target.checked)}
            />
            <span>{allowCreation ? "On" : "Off"}</span>
          </label>
        </div>
        <div style={{ marginTop: "var(--space-4)", display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : "Save setting"}
          </button>
        </div>
      </section>
    </div>
  );
}
