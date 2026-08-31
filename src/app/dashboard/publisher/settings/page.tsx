"use client";

import { useState, useEffect } from "react";
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
    fetch("/api/v1/publisher/settings").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setData(body.data ?? null);
        setEmail(body.data?.email ?? "");
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/publisher/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json();
      if (res.ok) {
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

  if (loading) return <div className="dashboard-page"><div className="stack" style={{ gap: 12 }}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> PUBLISHER / SETTINGS</p>
          <h1>Settings</h1>
        </div>
        <span className={`badge ${data?.retreaver_status === "active" ? "badge-success" : "badge-warning"}`}>
          {data?.retreaver_status ?? "—"}
        </span>
      </div>

      <section className="card" style={{ maxWidth: 640 }}>
        <h2>Profile</h2>
        <dl className="data-list">
          <dt>Name</dt><dd>{data?.name ?? "—"}</dd>
          <dt>Affiliate ID</dt><dd className="text-mono-sm">{data?.afid ?? "—"}</dd>
          <dt>Fixed Price</dt><dd className="text-mono-sm">{data?.fixed_price_cents ? formatCents(data.fixed_price_cents) : "—"}</dd>
          <dt>Email</dt>
          <dd>
            <div className="stack-h" style={{ gap: 6 }}>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={{ maxWidth: 280 }}
              />
              <button className="btn btn-sm btn-primary" onClick={save} disabled={saving || !email}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </dd>
        </dl>
        <p className="text-muted" style={{ fontSize: 11 }}>
          Name and pricing are managed by the platform admin. Contact support for changes.
        </p>
      </section>
    </div>
  );
}
