"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/use-toast";
import { usePublishers } from "@/features/publishers/use-publishers";

export default function NewCampaignPage() {
  const router = useRouter();
  const { publishers } = usePublishers();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [minSeconds, setMinSeconds] = useState("60");
  const [bufferSeconds, setBufferSeconds] = useState("30");
  const [routingStrategy, setRoutingStrategy] = useState("priority");
  const [publisherId, setPublisherId] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingAgency, setLoadingAgency] = useState(true);

  const fetchAgency = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/agencies");
      if (res.ok) {
        const body = await res.json();
        if (body.data?.length > 0) setAgencyId(body.data[0].id);
      }
    } catch {} finally {
      setLoadingAgency(false);
    }
  }, []);

  useEffect(() => { fetchAgency(); }, [fetchAgency]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !price || !agencyId) { setError("Name, price, and agency are required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agency_id: agencyId,
          name,
          routing_strategy: routingStrategy,
          price_cents: Math.round(parseFloat(price) * 100),
          min_connected_seconds: parseInt(minSeconds) || 60,
          buffer_seconds: parseInt(bufferSeconds) || 30,
          publisher_id: publisherId || null,
        }),
      });
      if (res.ok) {
        const body = await res.json();
        showToast("Campaign created", "success");
        router.push(`/dashboard/campaigns/${body.data.id}`);
      } else {
        const body = await res.json();
        setError(body.message ?? "Failed to create campaign");
        showToast(body.message ?? "Failed to create campaign", "error");
      }
    } catch {
      setError("Network error — is the server running?");
      showToast("Network error — is the server running?", "error");
    }
    setSaving(false);
  }

  const strategyHelp: Record<string, string> = {
    priority: "Agents with lowest priority number are tried first.",
    round_robin: "Incoming calls cycle evenly through all available agents.",
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / CAMPAIGNS / NEW</p>
          <h1>Create Campaign</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="split" style={{ "--gap": "var(--space-6)" } as React.CSSProperties}>

          <div className="stack" style={{ flex: 2, gap: "var(--space-5)" }}>

            <section className="card" style={{ padding: "var(--space-6)" }}>
              <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)", letterSpacing: "-0.03em" }}>Basic Info</h2>
              <div className="form-group">
                <label className="form-label" htmlFor="name">Campaign name</label>
                <input id="name" className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Illinois Auto Leads" required autoFocus />
                <span className="text-muted text-mono-sm" style={{ fontSize: 10, marginTop: 4, display: "block" }}>Give your campaign a clear, identifiable name.</span>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="strategy">Routing strategy</label>
                <select id="strategy" className="input" value={routingStrategy} onChange={(e) => setRoutingStrategy(e.target.value)} style={{ maxWidth: 280 }}>
                  <option value="priority">Priority</option>
                  <option value="round_robin">Round robin</option>
                </select>
                <span className="text-muted text-mono-sm" style={{ fontSize: 10, marginTop: 4, display: "block" }}>{strategyHelp[routingStrategy]}</span>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="publisher">Publisher</label>
                <select id="publisher" className="input" value={publisherId} onChange={(e) => setPublisherId(e.target.value)} style={{ maxWidth: 280 }}>
                  <option value="">None</option>
                  {publishers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <span className="text-muted text-mono-sm" style={{ fontSize: 10, marginTop: 4, display: "block" }}>The publisher sending traffic for this campaign (manage in Admin → Publishers).</span>
              </div>
            </section>

            <section className="card" style={{ padding: "var(--space-6)" }}>
              <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)", letterSpacing: "-0.03em" }}>Pricing</h2>
              <div className="form-group">
                <label className="form-label" htmlFor="price">Price per qualified call</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="text-mono-sm" style={{ color: "var(--muted)", fontSize: 15 }}>$</span>
                  <input id="price" className="input" type="number" step="0.01" min="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" required style={{ maxWidth: 160 }} />
                </div>
                <span className="text-muted text-mono-sm" style={{ fontSize: 10, marginTop: 4, display: "block" }}>
                  {price ? `$${parseFloat(price || "0").toFixed(2)} per call (${Math.round(parseFloat(price || "0") * 100)}¢)` : "Enter a price above $0.00"}
                </span>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="minSeconds">Minimum connected seconds</label>
                <input id="minSeconds" className="input" type="number" min="0" value={minSeconds} onChange={(e) => setMinSeconds(e.target.value)} style={{ maxWidth: 120 }} />
                <span className="text-muted text-mono-sm" style={{ fontSize: 10, marginTop: 4, display: "block" }}>Calls shorter than this won&apos;t be charged.</span>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="bufferSeconds">Buffer seconds</label>
                <input id="bufferSeconds" className="input" type="number" min="0" value={bufferSeconds} onChange={(e) => setBufferSeconds(e.target.value)} style={{ maxWidth: 120 }} />
                <span className="text-muted text-mono-sm" style={{ fontSize: 10, marginTop: 4, display: "block" }}>Non-billable listening period before pitching.</span>
              </div>
            </section>

          </div>

          <div className="stack" style={{ flex: 1, gap: "var(--space-5)" }}>

            <section className="card" style={{ padding: "var(--space-6)" }}>
              <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)", letterSpacing: "-0.03em" }}>Summary</h2>
              {loadingAgency ? (
                <div className="skeleton skeleton-text" style={{ width: "100%" }} />
              ) : (
                <dl className="data-list">
                  <dt>Agency</dt>
                  <dd className="text-mono-sm">{agencyId ? agencyId.slice(0, 8) + "..." : "—"}</dd>
                  <dt>Strategy</dt>
                  <dd className="text-mono-sm" style={{ textTransform: "capitalize" }}>{routingStrategy.replace("_", " ")}</dd>
                  <dt>Price</dt>
                  <dd className="text-mono-sm">{price ? `$${parseFloat(price).toFixed(2)}` : "—"}</dd>
                  <dt>Min connect</dt>
                  <dd className="text-mono-sm">{minSeconds || "60"}s</dd>
                  <dt>Buffer</dt>
                  <dd className="text-mono-sm">{bufferSeconds || "30"}s</dd>
                </dl>
              )}
            </section>

            {error && (
              <div className="card" style={{ padding: "var(--space-4)", border: "1px solid #704536", background: "#1a0e0a" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#e89b79" }}>{error}</p>
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={saving || !agencyId} style={{ width: "100%", justifyContent: "center" }}>
              {saving ? <span className="spinner" /> : "Create campaign"}
            </button>

            <button type="button" className="btn btn-secondary" onClick={() => router.push("/dashboard/campaigns")} style={{ width: "100%", justifyContent: "center" }}>
              Cancel
            </button>

          </div>
        </div>
      </form>
    </div>
  );
}
