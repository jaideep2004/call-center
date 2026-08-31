"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import { showToast } from "@/lib/use-toast";

interface WalletEntry {
  id: string;
  type: string;
  amount_cents: number;
  currency: string;
  call_id: string | null;
  provider_reference: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  top_up: "Top Up", reserve: "Reserve", release: "Release",
  charge: "Charge", refund: "Refund", manual_adjustment: "Adjustment", payout: "Payout",
  disposition_payout: "Disposition Payout", transfer: "Transfer",
};

const PRESET_AMOUNTS = [2500, 5000, 10000, 25000, 50000];

interface AgentPerformance {
  id: string;
  name: string;
  email: string | null;
  availability: string;
  approval_status: string;
  balance_cents: number;
  call_count: number;
  connected_seconds_ms: number;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s}s`;
}

function WalletInner() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showRecharge, setShowRecharge] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [recharging, setRecharging] = useState(false);

  const [agents, setAgents] = useState<AgentPerformance[]>([]);
  const [transferTarget, setTransferTarget] = useState<AgentPerformance | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [entriesRes, balanceRes] = await Promise.all([
        fetch(`/api/v1/wallet/entries?page=${page}&limit=25`),
        fetch(`/api/v1/wallet/balance`),
      ]);
      if (entriesRes.ok) {
        const body = await entriesRes.json();
        setEntries(body.data);
        setTotalPages(body.pagination.totalPages);
      }
      if (balanceRes.ok) {
        const body = await balanceRes.json();
        setBalance(body.data.balance_cents);
      }
      setLoading(false);
    }
    fetchData();
  }, [page]);

  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    if (success === "true") {
      showToast("Payment successful — refreshing balance...", "success");
      let attempts = 0;
      const iv = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch("/api/v1/wallet/balance", { cache: "no-store" });
          if (res.ok) {
            const body = await res.json();
            setBalance(body.data.balance_cents);
            const er = await fetch("/api/v1/wallet/entries?page=1&limit=25", { cache: "no-store" });
            if (er.ok) setEntries((await er.json()).data);
          }
        } catch {}
        if (attempts >= 5) clearInterval(iv);
      }, 1500);
      window.history.replaceState({}, "", window.location.pathname);
      return () => clearInterval(iv);
    }
    if (canceled === "true") {
      showToast("Payment canceled", "error");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/v1/wallet/agents")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) setAgents(body.data);
      })
      .catch(() => {});
  }, []);

  function formatCents(cents: number) {
    const abs = Math.abs(cents);
    return `${cents < 0 ? "-" : ""}$${(abs / 100).toFixed(2)}`;
  }

  async function handleRecharge(amountCents: number) {
    setRecharging(true);
    try {
      const res = await fetch("/api/v1/wallet/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_cents: amountCents }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.data?.url) window.location.href = body.data.url;
      } else {
        showToast("Failed to create checkout session", "error");
      }
    } catch {
      showToast("Failed to create checkout session", "error");
    } finally {
      setRecharging(false);
    }
  }

  async function handleTransfer() {
    if (!transferTarget) return;
    const amountCents = Math.round(parseFloat(transferAmount) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 100) {
      showToast("Enter a valid amount (min $1.00)", "error");
      return;
    }
    setTransferring(true);
    try {
      const res = await fetch("/api/v1/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: transferTarget.id, amount_cents: amountCents, reason: transferReason }),
      });
      const body = await res.json();
      if (res.ok) {
        showToast(`Transferred $${(amountCents / 100).toFixed(2)} to ${transferTarget.name}`, "success");
        window.location.reload();
      } else {
        showToast(body.message || "Transfer failed", "error");
      }
    } catch {
      showToast("Transfer failed", "error");
    } finally {
      setTransferring(false);
    }
  }

  const rechargeAmount = selectedPreset ?? (parseInt(customAmount) * 100 || 0);

  const columns: Column<WalletEntry>[] = [
    { key: "created_at", header: "Date", render: (e) => <span className="text-mono-sm">{new Date(e.created_at).toLocaleDateString()}</span> },
    { key: "type", header: "Type", render: (e) => <span className="badge">{TYPE_LABELS[e.type] ?? e.type}</span> },
    {
      key: "amount_cents", header: "Amount",
      render: (e) => <span className="text-mono-sm" style={{ color: e.amount_cents >= 0 ? "var(--accent)" : "var(--orange)" }}>{formatCents(e.amount_cents)}</span>,
    },
    { key: "call_id", header: "Call", render: (e) => <span className="text-mono-sm">{e.call_id ? e.call_id.slice(0, 8) : "—"}</span> },
    { key: "provider_reference", header: "Reference", render: (e) => <span className="text-mono-sm">{e.provider_reference ? e.provider_reference.slice(0, 12) : "—"}</span> },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> FINANCE / WALLET</p>
          <h1>Wallet</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowRecharge(true)}>+ Top Up</button>
      </div>
      {loading ? (
        <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : (
        <>
          <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
            <label className="form-label" style={{ fontSize: 11, letterSpacing: "0.08em", margin: 0 }}>CURRENT BALANCE</label>
            <p style={{ font: "500 48px/1 var(--serif)", margin: "8px 0 0", letterSpacing: "-0.03em" }}>{formatCents(balance)}</p>
            <p className="text-muted" style={{ fontSize: 12 }}>USD</p>
          </div>

          <div className="dashboard-page-header" style={{ marginTop: "var(--space-6)", marginBottom: "var(--space-4)" }}>
            <div>
              <label className="form-label" style={{ fontSize: 11, letterSpacing: "0.08em", margin: 0 }}>AGENT FUNDING</label>
              <h2 style={{ font: "500 22px var(--serif)", margin: "4px 0 0" }}>Agent Performance & Transfers</h2>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {agents.length === 0 ? (
              <p className="text-muted" style={{ padding: "var(--space-5)" }}>No agents found. Transfer balance to approved agents to keep them call-ready.</p>
            ) : (
              <table className="table" style={{ width: "100%", fontSize: 14 }}>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Status</th>
                    <th>Earnings</th>
                    <th>Calls</th>
                    <th>Talk Time</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <span style={{ fontWeight: 500 }}>{a.name}</span>
                        <span className="text-muted text-mono-sm" style={{ display: "block" }}>{a.email}</span>
                      </td>
                      <td><span className="badge">{a.availability}</span></td>
                      <td className="text-mono-sm">{formatCents(a.balance_cents)}</td>
                      <td className="text-mono-sm">{a.call_count}</td>
                      <td className="text-mono-sm">{formatDuration(a.connected_seconds_ms)}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn btn-sm" onClick={() => { setTransferTarget(a); setTransferAmount(""); setTransferReason(""); }}>Transfer →</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {transferTarget && (
            <div className="card" style={{ padding: "var(--space-6)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
                <h2 style={{ font: "500 18px var(--serif)", margin: 0, letterSpacing: "-0.03em" }}>Transfer to {transferTarget.name}</h2>
                <button className="btn btn-sm btn-ghost" onClick={() => setTransferTarget(null)}>Close</button>
              </div>
              <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
                <label className="form-label">Agent Wallet Balance</label>
                <p className="text-mono-sm" style={{ margin: 0 }}>{formatCents(transferTarget.balance_cents)} · {transferTarget.call_count} calls · {formatDuration(transferTarget.connected_seconds_ms)} talk time</p>
                <span className="form-hint">Funding keeps the agent call-ready (charges are deducted from their balance).</span>
              </div>
              <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
                <label className="form-label">Amount (USD)</label>
                <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                  <span style={{ font: "16px var(--sans)", color: "var(--muted)" }}>$</span>
                  <input className="input" type="number" min="1" placeholder="0.00" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} style={{ maxWidth: 180 }} />
                  <span className="text-muted" style={{ fontSize: 13 }}>Available: {formatCents(balance)}</span>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
                <label className="form-label">Notes (optional)</label>
                <input className="input" placeholder="e.g. Weekly advance" value={transferReason} onChange={(e) => setTransferReason(e.target.value)} style={{ maxWidth: 360 }} />
              </div>
              <button className="btn btn-primary" disabled={transferring} onClick={handleTransfer}>
                {transferring ? <span className="spinner" /> : `Transfer $${((Math.round(parseFloat(transferAmount) * 100) || 0) / 100).toFixed(2)}`}
              </button>
            </div>
          )}

          {showRecharge && (
            <div className="card" style={{ padding: "var(--space-6)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
                <h2 style={{ font: "500 18px var(--serif)", margin: 0, letterSpacing: "-0.03em" }}>Top Up Wallet</h2>
                <button className="btn btn-sm btn-ghost" onClick={() => { setShowRecharge(false); setSelectedPreset(null); setCustomAmount(""); }}>Close</button>
              </div>
              <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
                <label className="form-label">Quick Select Amount</label>
                <div className="toggle-group">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button key={amt} type="button" className={selectedPreset === amt ? "toggle-btn active" : "toggle-btn"} onClick={() => { setSelectedPreset(amt); setCustomAmount(""); }}>
                      ${(amt / 100).toFixed(0)}
                    </button>
                  ))}
                </div>
                <span className="form-hint">Choose a preset or enter a custom amount below.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Custom Amount</label>
                <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                  <span style={{ font: "16px var(--sans)", color: "var(--muted)" }}>$</span>
                  <input className="input" type="number" min="1" max="50000" placeholder="0.00" value={customAmount} onChange={(e) => { setCustomAmount(e.target.value); setSelectedPreset(null); }} style={{ maxWidth: 180 }} />
                  <span className="text-muted" style={{ fontSize: 13 }}>USD</span>
                  <button className="btn btn-primary" disabled={rechargeAmount < 100 || recharging} onClick={() => handleRecharge(rechargeAmount)}>
                    {recharging ? <span className="spinner" /> : `Pay $${(rechargeAmount / 100).toFixed(2)}`}
                  </button>
                </div>
                <span className="form-hint">Minimum $1.00. You&apos;ll be redirected to Stripe checkout to complete payment.</span>
              </div>
            </div>
          )}

          <div className="dashboard-page-header" style={{ marginTop: "var(--space-6)", marginBottom: 0 }}>
            <div>
              <label className="form-label" style={{ fontSize: 11, letterSpacing: "0.08em", margin: 0 }}>TRANSACTION HISTORY</label>
              <h2 style={{ font: "500 22px var(--serif)", margin: "4px 0 0" }}>Recent Entries</h2>
            </div>
            <Link href="/dashboard/wallet/invoices" className="text-mono-sm" style={{ color: "var(--cyan)" }}>View invoices →</Link>
          </div>
          <DataTable
            columns={columns}
            data={entries}
            emptyMessage="No wallet entries yet."
            page={page}
            totalPages={totalPages}
            total={entries.length}
            onPageChange={setPage}
            sortBy=""
            order="desc"
            onSort={() => {}}
          />
        </>
      )}
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div></div>}>
      <WalletInner />
    </Suspense>
  );
}
