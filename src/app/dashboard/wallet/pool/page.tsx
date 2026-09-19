"use client";

import { useState, useEffect, useCallback } from "react";
import { authClient } from "@/lib/auth-client";
import { formatCents } from "@/lib/format";
import { showToast } from "@/lib/use-toast";

interface Allocation {
  agent_id: string;
  allocated_cents: number;
  agent_display?: string | null;
}

interface PoolData {
  pool: { balance_cents: number; enabled: boolean };
  allocations: Allocation[];
  total_allocated_cents: number;
  remaining_cents: number;
}

interface AgentRow {
  id: string;
  name: string;
  balance_cents: number;
}

export default function PoolWalletPage() {
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isHead = role === "agency" || role === "admin" || role === "super_admin";

  const [data, setData] = useState<PoolData | null>(null);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState(5000);
  const [toppingUp, setToppingUp] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [poolRes, agentsRes] = await Promise.all([
      fetch("/api/v1/agency/wallet"),
      fetch("/api/v1/wallet/agents"),
    ]);
    if (poolRes.ok) {
      const body = await poolRes.json();
      setData(body.data);
      const next: Record<string, string> = {};
      for (const a of body.data.allocations as Allocation[]) {
        next[a.agent_id] = String(Math.round((a.allocated_cents ?? 0) / 100));
      }
      setDrafts(next);
    }
    if (agentsRes.ok) {
      const body = await agentsRes.json();
      setAgents(body.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleToggle() {
    if (!data) return;
    setToggling(true);
    try {
      const res = await fetch("/api/v1/agency/wallet", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !data.pool.enabled }),
      });
      if (res.ok) {
        showToast(data.pool.enabled ? "Pool wallet disabled" : "Pool wallet enabled", "success");
        refresh();
      } else {
        const body = await res.json().catch(() => ({} as { message?: string }));
        showToast(body.message ?? "Failed to update pool", "error");
      }
    } finally {
      setToggling(false);
    }
  }

  async function handleTopUp() {
    setToppingUp(true);
    try {
      const res = await fetch("/api/v1/agency/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_cents: Math.round(topUpAmount * 100) }),
      });
      const body = await res.json().catch(() => ({} as { url?: string; message?: string }));
      if (res.ok && body.url) {
        window.location.href = body.url;
      } else {
        showToast(body.message ?? "Failed to start checkout", "error");
      }
    } finally {
      setToppingUp(false);
    }
  }

  async function handleSaveAllocation(agentId: string) {
    const dollars = Number(drafts[agentId] ?? "0");
    if (!Number.isFinite(dollars) || dollars < 0) {
      showToast("Enter a valid amount in dollars", "error");
      return;
    }
    setSaving(agentId);
    try {
      const res = await fetch("/api/v1/agency/wallet/allocations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, allocated_cents: Math.round(dollars * 100) }),
      });
      const body = await res.json().catch(() => ({} as { message?: string }));
      if (res.ok) {
        showToast("Allocation updated", "success");
        refresh();
      } else {
        showToast(body.message ?? "Failed to save allocation", "error");
      }
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="stack" style={{ gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}
        </div>
      </div>
    );
  }

  if (!isHead) {
    return (
      <div className="dashboard-page">
        <section className="card card--spacious">
          <h1 style={{ margin: 0, font: "600 18px var(--serif)" }}>Pool Wallet</h1>
          <p className="text-muted" style={{ fontSize: 13 }}>Only the agency head can manage the pool wallet.</p>
        </section>
      </div>
    );
  }

  const allocByAgent = new Map((data?.allocations ?? []).map((a) => [a.agent_id, a.allocated_cents]));

  return (
    <div className="dashboard-page">
      <section className="card card--spacious" aria-labelledby="pool-title">
        <p className="eyebrow"><i aria-hidden /> AGENCY / POOL WALLET</p>
        <h1 id="pool-title" style={{ margin: "4px 0 0", font: "600 20px var(--serif)" }}>Pool Wallet</h1>
        <p className="text-muted" style={{ fontSize: 12 }}>
          Shared pool funds per-agent allocations. Effective balance = personal + allocated.
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
          <div>
            <span className="call-detail-label">Pool balance</span>
            <p style={{ margin: "2px 0 0", font: "600 20px var(--mono)" }}>{formatCents(data?.pool.balance_cents ?? 0)}</p>
          </div>
          <div>
            <span className="call-detail-label">Allocated</span>
            <p style={{ margin: "2px 0 0", font: "600 20px var(--mono)" }}>{formatCents(data?.total_allocated_cents ?? 0)}</p>
          </div>
          <div>
            <span className="call-detail-label">Remaining</span>
            <p style={{ margin: "2px 0 0", font: "600 20px var(--mono)", color: (data?.remaining_cents ?? 0) < 0 ? "var(--danger, #ef4444)" : "var(--success, #22c55e)" }}>
              {formatCents(data?.remaining_cents ?? 0)}
            </p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <button className={`btn btn-sm ${data?.pool.enabled ? "btn-secondary" : "btn-primary"}`} onClick={handleToggle} disabled={toggling} aria-pressed={!!data?.pool.enabled}>
              {toggling ? "…" : data?.pool.enabled ? "Disable pool" : "Enable pool"}
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            <span className="call-detail-label">Top up pool (USD)</span>
            <input className="input" type="number" min={1} value={topUpAmount} onChange={(e) => setTopUpAmount(Number(e.target.value))} style={{ width: 140 }} />
          </label>
          <button className="btn btn-primary btn-sm" onClick={handleTopUp} disabled={toppingUp} aria-busy={toppingUp}>
            {toppingUp ? "Redirecting…" : "Top up via card"}
          </button>
        </div>
      </section>

      <section className="card card--spacious" aria-labelledby="alloc-title" style={{ marginTop: 16 }}>
        <h2 id="alloc-title" style={{ margin: 0, font: "600 16px var(--serif)" }}>Agent Allocations</h2>
        <p className="text-muted" style={{ fontSize: 12 }}>Amounts in USD. Total allocations can never exceed the pool balance.</p>
        {agents.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 12 }}>No agents in your agency yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {agents.map((a) => (
              <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 10, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 13, flex: "1 1 140px", minWidth: 0 }}>{a.name}</strong>
                <span className="text-mono-sm" style={{ fontSize: 11, color: "var(--muted)" }}>
                  personal {formatCents(a.balance_cents)} · effective {formatCents(a.balance_cents + (allocByAgent.get(a.id) ?? 0))}
                </span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={drafts[a.id] ?? "0"}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [a.id]: e.target.value }))}
                  aria-label={`Allocation for ${a.name} in dollars`}
                  style={{ width: 110 }}
                />
                <button className="btn btn-sm btn-secondary" onClick={() => handleSaveAllocation(a.id)} disabled={saving === a.id}>
                  {saving === a.id ? "…" : "Save"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
