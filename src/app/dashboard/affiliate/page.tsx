"use client";

import { useState, useEffect } from "react";
import { showToast } from "@/lib/use-toast";

interface Affiliate {
  id: string;
  agent_id: string;
  code: string;
  commission_pct: number;
  total_earned_cents: number;
  created_at: string;
}

export default function AffiliatePage() {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState("");

  useEffect(() => {
    fetch("/api/v1/affiliates").then(async (res) => {
      if (res.ok) {
        const b = await res.json();
        if (b.data?.length) setAffiliate(b.data[0]);
      }
      setLoading(false);
    });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode.trim()) return;
    try {
      const res = await fetch("/api/v1/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: "current", code: newCode.trim() }),
      });
      const b = await res.json();
      if (res.ok) {
        setAffiliate(b.data);
        setShowCreate(false);
        setNewCode("");
        showToast("Affiliate code created", "success");
      } else {
        showToast(b.message ?? "Failed to create affiliate code", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

  function formatCents(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> AFFILIATE</p>
          <h1>Affiliate Program</h1>
        </div>
      </div>

      {!affiliate && !showCreate ? (
        <div className="empty-state">
          <p>You don't have an affiliate code yet.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginTop: "var(--space-3)" }}>Create Affiliate Code</button>
        </div>
      ) : showCreate ? (
        <div className="card" style={{ maxWidth: 400 }}>
          <h2>Create Affiliate Code</h2>
          <form onSubmit={handleCreate} className="stack" style={{ gap: "var(--space-3)" }}>
            <label className="text-mono-sm" style={{ fontSize: 10, letterSpacing: 1, color: "var(--muted)" }}>AFFILIATE CODE</label>
            <input className="input" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. agent-sarah" />
            <div className="split" style={{ gap: 8 } as React.CSSProperties}>
              <button className="btn btn-primary" type="submit" disabled={!newCode.trim()}>Create</button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </form>
        </div>
      ) : affiliate ? (
        <div className="split" style={{ "--gap": "2rem" } as React.CSSProperties}>
          <div className="card" style={{ flex: 1 }}>
            <h2>Your Affiliate Code</h2>
            <p className="text-mono-sm" style={{ fontSize: 24, letterSpacing: 1, margin: "var(--space-3) 0" }}>{affiliate.code}</p>
            <dl className="data-list">
              <dt>Commission Rate</dt><dd className="text-mono-sm">{affiliate.commission_pct}%</dd>
              <dt>Total Earned</dt><dd className="text-mono-sm" style={{ fontSize: 20 }}>{formatCents(affiliate.total_earned_cents)}</dd>
              <dt>Created</dt><dd className="text-mono-sm">{new Date(affiliate.created_at).toLocaleDateString()}</dd>
            </dl>
          </div>
          <div className="card" style={{ flex: 1 }}>
            <h2>How It Works</h2>
            <div className="stack" style={{ gap: "var(--space-3)", fontSize: 13 }}>
              <p><strong>1.</strong> Share your affiliate code with prospects</p>
              <p><strong>2.</strong> When they sign up and run campaigns, you earn {affiliate.commission_pct}% commission</p>
              <p><strong>3.</strong> Commissions are credited to your wallet automatically</p>
              <p><strong>4.</strong> Track your earnings and referrals here</p>
            </div>
            <p className="text-muted" style={{ fontSize: 12, marginTop: "var(--space-4)" }}>
              Share link: <span className="text-mono-sm">{typeof window !== "undefined" ? `${window.location.origin}/register?ref=${affiliate.code}` : ""}</span>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
