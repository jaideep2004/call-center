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
  const [recordCalls, setRecordCalls] = useState(true);
  const [publisherIds, setPublisherIds] = useState<string[]>([]);
  const [agencyId, setAgencyId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingAgency, setLoadingAgency] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);

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

  function canContinueStep1() {
    return name.trim().length > 0;
  }

  function handleContinue() {
    if (!canContinueStep1()) {
      setError("Campaign name is required");
      return;
    }
    setError("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
          record_calls: recordCalls,
          price_cents: Math.round(parseFloat(price) * 100),
          min_connected_seconds: parseInt(minSeconds) || 60,
          buffer_seconds: parseInt(bufferSeconds) || 30,
          publisher_ids: publisherIds,
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
    <div className="dashboard-page" style={{ paddingBottom: 24 }}>
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / CAMPAIGNS / NEW <span style={{ color: "var(--muted)", letterSpacing: "0.8px", marginLeft: 10 }}>• STEP {step} OF 2 — {step === 1 ? "BASIC INFO" : "PRICING & PUBLISHERS"}</span></p>
          <h1>{step === 1 ? "Create Campaign" : "Pricing & Publishers"}</h1>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 6, maxWidth: 560 }}>{step === 1 ? "Start with the basics — name and how calls will be routed." : "Set what a qualified call is worth and who can send traffic."}</p>
        </div>
      </div>

      {/* progress eyebrow */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", background: "linear-gradient(135deg, rgba(22,12,42,.66), rgba(28,16,56,.62))", backdropFilter: "blur(8px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          {[
            { n: 1, label: "Basic Info" },
            { n: 2, label: "Pricing & Publishers" },
          ].map((s, idx) => {
            const active = step === s.n;
            const done = step > s.n;
            return (
              <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 9999, display: "grid", placeItems: "center",
                    font: "700 11px var(--mono)", border: "1px solid " + (active || done ? "var(--acid)" : "var(--line)"),
                    background: done ? "var(--acid)" : active ? "rgba(168,85,247,.18)" : "transparent",
                    color: done ? "#fff" : active ? "var(--acid)" : "var(--muted)", boxShadow: active ? "0 0 12px rgba(168,85,247,.28)" : "none",
                    flexShrink: 0,
                  }}>{done ? "✓" : s.n}</span>
                  <span style={{ font: active ? "600 12px var(--sans)" : "500 12px var(--sans)", color: active ? "var(--ink)" : done ? "var(--muted)" : "var(--muted)", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>{s.label}</span>
                </div>
                {idx === 0 && <div style={{ flex: 1, height: 1, background: step === 2 ? "var(--acid)" : "var(--line)", opacity: step === 2 ? 1 : 0.6, margin: "0 4px" }} />}
              </div>
            );
          })}
        </div>
        <span className="text-mono-sm" style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap", display: "none" } as React.CSSProperties}>2 steps</span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "contents" }}>
        <div className="split" style={{ gap: "var(--space-6)" } as React.CSSProperties}>
          <div className="stack" style={{ flex: 2, gap: "var(--space-5)", minWidth: 0 }}>

            {step === 1 && (
              <section className="card card--form">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 6, height: 18, borderRadius: 9999, background: "var(--acid)", boxShadow: "0 0 10px rgba(168,85,247,.35)" }} aria-hidden />
                  <h2 style={{ font: "500 18px var(--serif)", margin: 0, letterSpacing: "-0.03em" }}>Basic Info</h2>
                  <span className="badge" style={{ marginLeft: "auto", fontSize: 9, letterSpacing: "0.8px" }}>STEP 1</span>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="name">Campaign name <span style={{ color: "var(--acid)" }}>*</span></label>
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
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" checked={recordCalls} onChange={(e) => setRecordCalls(e.target.checked)} style={{ accentColor: "var(--acid)", width: 16, height: 16 }} />
                    Record calls
                  </label>
                  <span className="text-muted text-mono-sm" style={{ fontSize: 10, marginTop: 4, display: "block" }}>When enabled, qualified calls are recorded for QA and dispute review. Can be changed later in General tab.</span>
                </div>
                {error && (
                  <div className="card" style={{ padding: "var(--space-3) var(--space-4)", border: "1px solid #704536", background: "#1a0e0a" }}>
                    <p style={{ margin: 0, fontSize: 12, color: "#e89b79" }}>{error}</p>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => router.push("/dashboard/campaigns")} style={{ flex: 1, justifyContent: "center" }}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleContinue} disabled={!canContinueStep1()} style={{ flex: 1.2, justifyContent: "center", opacity: canContinueStep1() ? 1 : 0.6 }}>
                    Continue → Pricing
                  </button>
                </div>
              </section>
            )}

            {step === 2 && (
              <>
                <section className="card card--form">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 6, height: 18, borderRadius: 9999, background: "var(--acid)", boxShadow: "0 0 10px rgba(168,85,247,.35)" }} aria-hidden />
                    <h2 style={{ font: "500 18px var(--serif)", margin: 0, letterSpacing: "-0.03em" }}>Pricing</h2>
                    <span className="badge" style={{ marginLeft: "auto", fontSize: 9, letterSpacing: "0.8px" }}>STEP 2</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="price">Price per qualified call <span style={{ color: "var(--acid)" }}>*</span></label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="text-mono-sm" style={{ color: "var(--muted)", fontSize: 15 }}>$</span>
                      <input id="price" className="input" type="number" step="0.01" min="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" required style={{ maxWidth: 160 }} />
                    </div>
                    <span className="text-muted text-mono-sm" style={{ fontSize: 10, marginTop: 4, display: "block" }}>
                      {price ? `$${parseFloat(price || "0").toFixed(2)} per call (${Math.round(parseFloat(price || "0") * 100)}¢)` : "Enter a price above $0.00"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="minSeconds">Minimum connected seconds</label>
                      <input id="minSeconds" className="input" type="number" min="0" value={minSeconds} onChange={(e) => setMinSeconds(e.target.value)} style={{ maxWidth: 140 }} />
                      <span className="text-muted text-mono-sm" style={{ fontSize: 10, marginTop: 4, display: "block" }}>Calls shorter than this won&apos;t be charged.</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="bufferSeconds">Buffer seconds</label>
                      <input id="bufferSeconds" className="input" type="number" min="0" value={bufferSeconds} onChange={(e) => setBufferSeconds(e.target.value)} style={{ maxWidth: 140 }} />
                      <span className="text-muted text-mono-sm" style={{ fontSize: 10, marginTop: 4, display: "block" }}>Non-billable listening period before pitching.</span>
                    </div>
                  </div>
                </section>

                <section className="card card--form">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                    <h2 style={{ font: "500 18px var(--serif)", margin: 0, letterSpacing: "-0.03em" }}>Publishers</h2>
                    <span className="badge" style={{ fontSize: 9 }}>{publisherIds.length} selected</span>
                    <span className="text-muted text-mono-sm" style={{ marginLeft: "auto", fontSize: 10 }}>multi-select</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 196, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10, padding: 10, background: "rgba(22,12,42,.45)" }}>
                    {publishers.length === 0 ? (
                      <span className="text-muted text-mono-sm" style={{ fontSize: 11 }}>No publishers yet — create one in Admin → Publishers.</span>
                    ) : (
                      publishers.map((p) => {
                        const checked = publisherIds.includes(p.id);
                        return (
                          <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer", padding: "6px 8px", borderRadius: 8, background: checked ? "rgba(168,85,247,.12)" : "transparent", border: "1px solid " + (checked ? "rgba(168,85,247,.22)" : "transparent") }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setPublisherIds((prev) => (e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)));
                              }}
                              style={{ accentColor: "var(--acid)" }}
                            />
                            <span style={{ fontWeight: checked ? 600 : 400 }}>{p.name}</span>
                            {checked && <span className="badge badge-success" style={{ marginLeft: "auto", fontSize: 9 }}>selected</span>}
                          </label>
                        );
                      })
                    )}
                  </div>
                  <span className="text-muted text-mono-sm" style={{ fontSize: 10, marginTop: 4, display: "block" }}>
                    Select one or more publishers sending traffic for this campaign. Leave empty for none.
                  </span>
                </section>

                {error && (
                  <div className="card" style={{ padding: "var(--space-3) var(--space-4)", border: "1px solid #704536", background: "#1a0e0a" }}>
                    <p style={{ margin: 0, fontSize: 12, color: "#e89b79" }}>{error}</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="stack" style={{ flex: 1, gap: "var(--space-4)", minWidth: 260 }}>
            <section className="card card--form">
              <h2 style={{ font: "500 18px var(--serif)", margin: 0, letterSpacing: "-0.03em" }}>Summary</h2>
              {loadingAgency ? (
                <div className="skeleton skeleton-text" style={{ width: "100%" }} />
              ) : (
                <dl className="data-list">
                  <dt>Agency</dt>
                  <dd className="text-mono-sm">{agencyId ? agencyId.slice(0, 8) + "…" : "—"}</dd>
                  <dt>Strategy</dt>
                  <dd className="text-mono-sm" style={{ textTransform: "capitalize" }}>{routingStrategy.replace("_", " ")}</dd>
                  <dt>Record</dt>
                  <dd className="text-mono-sm">{recordCalls ? "Yes" : "No"}</dd>
                  <dt>Price</dt>
                  <dd className="text-mono-sm">{price ? `$${parseFloat(price).toFixed(2)}` : "—"}</dd>
                  <dt>Min connect</dt>
                  <dd className="text-mono-sm">{minSeconds || "60"}s</dd>
                  <dt>Buffer</dt>
                  <dd className="text-mono-sm">{bufferSeconds || "30"}s</dd>
                  <dt>Publishers</dt>
                  <dd className="text-mono-sm">{publisherIds.length ? `${publisherIds.length} selected` : "None"}</dd>
                </dl>
              )}
              <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(168,85,247,.08)", border: "1px solid rgba(168,85,247,.14)" }}>
                <p className="text-muted text-mono-sm" style={{ fontSize: 10, margin: 0, lineHeight: 1.5 }}>
                  {step === 1 ? "Step 1 of 2 — finish basic info to unlock pricing." : "Ready to create — review pricing and publishers, then save."}
                </p>
              </div>
            </section>

            {step === 2 && (
              <div className="card" style={{ padding: "var(--space-4)", background: "linear-gradient(135deg, rgba(33,20,61,.96), rgba(26,16,51,.92))", border: "1px solid rgba(168,85,247,.16)" }}>
                <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
                  Publishers use the <span style={{ color: "var(--ink)", fontWeight: 600 }}>campaign_publishers</span> join (multi-select). Leave empty to keep campaign open.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* sticky save bar */}
        <div style={{
          position: "sticky", bottom: 0, zIndex: 20, marginTop: "var(--space-6)",
          display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
          background: "linear-gradient(135deg, rgba(18,7,30,.96), rgba(22,12,42,.96))",
          border: "1px solid var(--line)", borderRadius: "var(--radius-md)",
          boxShadow: "0 12px 32px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.05)",
          backdropFilter: "blur(10px)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span className="badge" style={{ fontSize: 9, letterSpacing: "0.7px" }}>STEP {step} / 2</span>
            <span className="text-mono-sm" style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {step === 1 ? (name ? `"${name}"` : "Name required to continue") : (price ? `Will create at $${parseFloat(price || "0").toFixed(2)}/call • ${publisherIds.length} publisher${publisherIds.length === 1 ? "" : "s"}` : "Price required")}
            </span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            {step === 2 && (
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)} style={{ whiteSpace: "nowrap" }}>
                ← Back
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => router.push("/dashboard/campaigns")} style={{ whiteSpace: "nowrap" }}>
              Cancel
            </button>
            {step === 1 ? (
              <button type="button" className="btn btn-primary" onClick={handleContinue} disabled={!canContinueStep1()} style={{ minWidth: 132, justifyContent: "center", opacity: canContinueStep1() ? 1 : 0.6 }}>
                Continue
              </button>
            ) : (
              <button className="btn btn-primary" type="submit" disabled={saving || !agencyId || !price} style={{ minWidth: 148, justifyContent: "center" }}>
                {saving ? <span className="spinner" /> : "Create campaign"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
