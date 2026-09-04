"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { showToast } from "@/lib/use-toast";
import { formatCents } from "@/lib/format";

interface PublisherSettings {
  id: string;
  name: string;
  email: string | null;
  afid: string | null;
  fixed_price_cents: number | null;
  retreaver_status: string;
}

export default function PublisherSettingsPage() {
  const [data, setData] = useState<PublisherSettings | null>(null);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/publisher/settings")
      .then(async (res) => {
        if (res.ok) {
          const body = await res.json();
          setData(body.data ?? null);
          setEmail(body.data?.email ?? "");
        } else {
          const body = await res.json().catch(() => ({}));
          showToast(body.message ?? "Failed to load settings", "error");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save() {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showToast("Enter a valid email address", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/publisher/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const body = await res.json();
      if (res.ok) {
        setData((prev) => (prev ? { ...prev, email: trimmed } : prev));
        showToast("Settings saved", "success");
      } else {
        showToast(body.message ?? "Save failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="dashboard-page">
        <div className="stack" style={{ gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-text" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow">
            <i /> PUBLISHER / SETTINGS
          </p>
          <h1>Settings</h1>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 6, maxWidth: 560 }}>
            Manage your contact email. Name and pricing are managed by the platform admin — contact support for changes.
          </p>
        </div>
        <span className={`badge ${data?.retreaver_status === "active" ? "badge-success" : data?.retreaver_status === "paused" ? "badge-warning" : "badge-info"}`}>
          {data?.retreaver_status ?? "—"}
        </span>
      </div>

      <div className="publisher-settings-grid">
        <section className="card card--spacious">
          <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)" }}>Profile</h2>
          <div style={{ overflowX: "auto" }}>
            <dl className="data-list">
              <dt>Name</dt>
              <dd>{data?.name ?? "—"}</dd>
              <dt>Affiliate ID</dt>
              <dd className="text-mono-sm">{data?.afid ?? "—"}</dd>
              <dt>Fixed Price</dt>
              <dd className="text-mono-sm">{data?.fixed_price_cents ? formatCents(data.fixed_price_cents) : "—"}</dd>
              <dt>Retreaver Status</dt>
              <dd>
                <span className={`badge ${data?.retreaver_status === "active" ? "badge-success" : data?.retreaver_status === "paused" ? "badge-warning" : "badge-info"}`}>
                  {data?.retreaver_status ?? "—"}
                </span>
              </dd>
              <dt>Email</dt>
              <dd>
                <div className="filter-bar filter-bar--plain" style={{ gap: 10, padding: 0 }}>
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        save();
                      }
                    }}
                    placeholder="you@company.com"
                    style={{ maxWidth: 320, flex: "1 1 220px" }}
                    aria-label="Email address"
                  />
                  <button className="btn btn-sm btn-primary" onClick={save} disabled={saving || !email.trim()} style={{ height: 40, minWidth: 86 }}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
                <p className="text-muted" style={{ fontSize: 11, marginTop: 10 }}>
                  This email is used for payout notifications and account recovery. Press Enter or click Save to update.
                </p>
              </dd>
            </dl>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: "var(--space-5)", flexWrap: "wrap" }}>
            <Link href="/dashboard/publisher" className="btn btn-secondary btn-sm">
              Back to Overview
            </Link>
            <Link href="/dashboard/publisher/payouts" className="btn btn-ghost btn-sm">
              View Payouts
            </Link>
          </div>
        </section>

        <section className="card card--spacious">
          <h2 style={{ font: "500 16px var(--serif)", margin: "0 0 var(--space-4)" }}>Help & Actions</h2>
          <div className="stack" style={{ gap: 14 }}>
            <div style={{ padding: "var(--space-4)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.02)" }}>
              <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>Need to update name or pricing?</p>
              <p className="text-muted" style={{ fontSize: 11, margin: "6px 0 0" }}>
                These fields are managed by the platform. Reach out to your account manager or use the support channel.
              </p>
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => showToast("Contact support at support@gds.local — include your affiliate ID.", "info")}
              >
                Contact Support
              </button>
            </div>
            <div style={{ padding: "var(--space-4)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }}>
              <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>Tracking & Integration</p>
              <p className="text-muted" style={{ fontSize: 11, margin: "6px 0 0" }}>
                Your call tracking links are tied to your Affiliate ID. Share them in your campaigns to attribute calls correctly.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <Link href="/dashboard/publisher/campaigns" className="btn btn-secondary btn-sm">
                  View Campaigns
                </Link>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={async () => {
                    const id = data?.afid ?? data?.id ?? "";
                    if (!id) {
                      showToast("No affiliate ID yet", "info");
                      return;
                    }
                    try {
                      await navigator.clipboard.writeText(id);
                      showToast("Affiliate ID copied", "success");
                    } catch {
                      showToast(`Affiliate ID: ${id}`, "info");
                    }
                  }}
                >
                  Copy Affiliate ID
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
