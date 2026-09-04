"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

const TYPE_COLORS: Record<string, string> = {
  top_up: "badge-success", reserve: "badge-warning", release: "badge-info",
  charge: "badge-danger", refund: "badge-success", payout: "badge-success",
  transfer: "badge-info",
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
function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const PAGE_SIZE = 10;
function WalletInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const initialAgentQ = searchParams.get("aq") ?? "";

  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(initialPage);
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
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [agentSearch, setAgentSearch] = useState(initialAgentQ);
  const [agentDebounced, setAgentDebounced] = useState(initialAgentQ);
  const [agentPage, setAgentPage] = useState(1);
  const hasMounted = useRef(false);

  useEffect(() => {
    async function fetchData() {
      const [entriesRes, balanceRes] = await Promise.all([
        fetch(`/api/v1/wallet/entries?page=${page}&limit=${PAGE_SIZE}`),
        fetch(`/api/v1/wallet/balance`),
      ]);
      if (entriesRes.ok) {
        const body = await entriesRes.json();
        setEntries(body.data ?? []);
        setTotalPages(body.pagination?.totalPages ?? 1);
      }
      if (balanceRes.ok) {
        const body = await balanceRes.json();
        setBalance(body.data?.balance_cents ?? 0);
      }
      setLoading(false);
    }
    fetchData();
  }, [page]);

  useEffect(() => {
    fetch("/api/v1/wallet/agents")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) setAgents(body.data);
      })
      .catch(() => {});
  }, []);

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
            const er = await fetch("/api/v1/wallet/entries?page=1&limit=10", { cache: "no-store" });
            if (er.ok) setEntries((await er.json()).data ?? []);
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
    const t = setTimeout(() => {
      const trimmed = searchInput.trim().toLowerCase();
      if (trimmed !== debouncedQ) { setDebouncedQ(trimmed); setPage(1); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, debouncedQ]);

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = agentSearch.trim().toLowerCase();
      if (trimmed !== agentDebounced) { setAgentDebounced(trimmed); setAgentPage(1); }
    }, 300);
    return () => clearTimeout(t);
  }, [agentSearch, agentDebounced]);

  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return; }
    const p = new URLSearchParams();
    if (debouncedQ) p.set("q", debouncedQ);
    if (agentDebounced) p.set("aq", agentDebounced);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, agentDebounced, page, router, searchParams]);

  async function handleRecharge() {
    const amount = selectedPreset ?? (customAmount ? Math.round(Number(customAmount) * 100) : 0);
    if (!amount || amount < 100) { showToast("Enter a valid amount", "error"); return; }
    setRecharging(true);
    try {
      const res = await fetch("/api/v1/wallet/recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_cents: amount }),
      });
      const body = await res.json();
      if (res.ok && body.data?.url) window.location.href = body.data.url;
      else showToast(body.message ?? "Failed to start checkout", "error");
    } catch { showToast("Network error", "error"); }
    setRecharging(false);
  }

  async function handleTransfer() {
    if (!transferTarget || !transferAmount) return;
    setTransferring(true);
    try {
      const res = await fetch("/api/v1/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: transferTarget.id, amount_cents: Math.round(Number(transferAmount) * 100), reason: transferReason }),
      });
      const body = await res.json();
      if (res.ok) {
        showToast("Transfer sent", "success");
        setTransferTarget(null);
        setTransferAmount("");
        setTransferReason("");
      } else showToast(body.message ?? "Transfer failed", "error");
    } catch { showToast("Network error", "error"); }
    setTransferring(false);
  }

  const filteredAgents = useMemo(() => {
    if (!agentDebounced) return agents;
    const q = agentDebounced;
    return agents.filter((a) => a.name.toLowerCase().includes(q) || (a.email ?? "").toLowerCase().includes(q));
  }, [agents, agentDebounced]);
  const agentTotalPages = Math.max(1, Math.ceil(filteredAgents.length / PAGE_SIZE));
  const paginatedAgents = useMemo(() => filteredAgents.slice((agentPage - 1) * PAGE_SIZE, agentPage * PAGE_SIZE), [filteredAgents, agentPage]);

  const entryColumns: Column<WalletEntry>[] = [
    { key: "type", header: "Type", render: (e) => <span className={`badge ${TYPE_COLORS[e.type] ?? ""}`}>{TYPE_LABELS[e.type] ?? e.type}</span> },
    { key: "amount_cents", header: "Amount", render: (e) => <span style={{ color: e.amount_cents > 0 ? "var(--accent)" : "var(--orange)", fontWeight: 600 }}>{formatCents(e.amount_cents)}</span> },
    { key: "call_id", header: "Call", render: (e) => <span className="text-mono-sm">{e.call_id?.slice(0, 8) ?? "—"}</span> },
    { key: "provider_reference", header: "Reference", render: (e) => <span className="text-mono-sm">{e.provider_reference ? e.provider_reference.slice(0, 12) : "—"}</span> },
    { key: "created_at", header: "Date", render: (e) => <span className="text-mono-sm">{new Date(e.created_at).toLocaleDateString()}</span> },
  ];

  const agentColumns: Column<AgentPerformance>[] = [
    { key: "name", header: "Agent", render: (a) => <div><span style={{ fontWeight: 500 }}>{a.name}</span><span className="text-muted text-mono-sm" style={{ display: "block", fontSize: 10 }}>{a.email ?? ""}</span></div> },
    { key: "availability", header: "Status", render: (a) => <span className={`badge ${a.availability === "available" ? "badge-success" : a.availability === "busy" ? "badge-warning" : ""}`}>{a.availability}</span> },
    { key: "balance_cents", header: "Earnings", render: (a) => <span className="text-mono-sm" style={{ color: "var(--accent)" }}>{formatCents(a.balance_cents)}</span> },
    { key: "call_count", header: "Calls", render: (a) => <span className="badge badge-info">{a.call_count}</span> },
    { key: "connected_seconds_ms", header: "Talk Time", render: (a) => <span className="text-mono-sm">{formatDuration(a.connected_seconds_ms)}</span> },
    { key: "actions", header: "", render: (a) => <button className="btn btn-sm" onClick={() => { setTransferTarget(a); setTransferAmount(""); setTransferReason(""); }}>Transfer →</button> },
  ];

  return (
    <div className="dashboard-page">
      <div className="filter-bar">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}><i /> FINANCE / WALLET</p>
          <h1 style={{ margin: "4px 0 0" }}>Wallet</h1>
        </div>
        <div className="filter-bar__group" style={{ marginLeft: "auto" }}>
          <input className="input" type="search" placeholder="Search entries…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ minWidth: 220 }} />
          <button className="btn btn-primary" style={{ height: 40, whiteSpace: "nowrap" }} onClick={() => setShowRecharge(true)}>+ Top Up</button>
        </div>
      </div>
      {loading ? (
        <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : (
        <>
          <div className="card card--spacious wallet-balance-card">
            <label className="form-label" style={{ fontSize: 11, letterSpacing: "0.08em", margin: 0 }}>CURRENT BALANCE</label>
            <p style={{ font: "500 48px/1 var(--serif)", margin: "10px 0 0", letterSpacing: "-0.03em" }}>{formatCents(balance)}</p>
            <p className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>USD · Available for top-up and transfers</p>
          </div>

          {showRecharge && (
            <div className="card card--spacious">
              <h3 style={{ margin: "0 0 4px", font: "500 16px var(--serif)" }}>Top up</h3>
              <p className="text-muted" style={{ fontSize: 11, margin: "0 0 var(--space-4)" }}>Grouped presets + custom amount — checkout via Stripe.</p>
              <div className="filter-bar filter-bar--plain" style={{ marginTop: 0, padding: 0, flexWrap: "wrap" }}>
                <div className="filter-bar__group" style={{ flexWrap: "wrap" }}>
                  {PRESET_AMOUNTS.map((amt) => (
                    <button key={amt} className={`btn btn-sm ${selectedPreset === amt ? "btn-primary" : ""}`} onClick={() => { setSelectedPreset(amt); setCustomAmount(""); }}>{formatCents(amt)}</button>
                  ))}
                  <input className="input" type="number" placeholder="Custom $" value={customAmount} onChange={(e) => { setCustomAmount(e.target.value); setSelectedPreset(null); }} style={{ maxWidth: 130, minWidth: 110 }} />
                </div>
                <div className="filter-bar__group" style={{ marginLeft: "auto" }}>
                  <button className="btn btn-primary btn-sm" style={{ height: 36 }} onClick={handleRecharge} disabled={recharging}>{recharging ? "…" : "Checkout"}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowRecharge(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div className="card card--spacious">
            <div className="card-header" style={{ padding: 0, border: 0, marginBottom: 0 }}>
              <h2 style={{ margin: 0, font: "500 16px var(--serif)" }}>Transaction History</h2>
              <span className="filter-bar__meta">{entries.length} shown · page {page}/{totalPages}</span>
            </div>
            <DataTable
              columns={entryColumns}
              data={entries}
              emptyMessage="No transactions yet."
              page={page}
              totalPages={totalPages}
              total={entries.length}
              onPageChange={setPage}
              sortBy="created_at"
              order="desc"
              onSort={() => {}}
            />
          </div>

          <div className="filter-bar">
            <div>
              <label className="form-label" style={{ fontSize: 11, letterSpacing: "0.08em", margin: 0 }}>AGENT FUNDING</label>
              <h2 style={{ font: "500 16px var(--serif)", margin: "4px 0 0" }}>Agent Performance & Transfers</h2>
            </div>
            <div className="filter-bar__primary" style={{ justifyContent: "flex-end" }}>
              <input className="input" type="search" placeholder="Search agents…" value={agentSearch} onChange={(e) => setAgentSearch(e.target.value)} style={{ minWidth: 220, maxWidth: 300 }} />
            </div>
            <span className="filter-bar__meta">{filteredAgents.length} agent(s){agentDebounced ? " (filtered)" : ""}</span>
          </div>

          <div className="card card--spacious">
            {filteredAgents.length === 0 ? (
              <div className="empty-state"><p>{agents.length === 0 ? "No agents found. Transfer balance to approved agents to keep them call-ready." : `No agents match "${agentDebounced}".`}</p></div>
            ) : (
              <DataTable
                columns={agentColumns}
                data={paginatedAgents}
                emptyMessage="No agents"
                page={agentPage}
                totalPages={agentTotalPages}
                total={filteredAgents.length}
                onPageChange={setAgentPage}
                sortBy="name"
                order="asc"
                onSort={() => {}}
              />
            )}
          </div>

          {transferTarget && (
            <div className="card card--spacious">
              <h3 style={{ margin: "0 0 var(--space-4)", font: "500 16px var(--serif)" }}>Transfer to {transferTarget.name}</h3>
              <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
                <input className="input" type="number" placeholder="Amount $" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} />
                <input className="input" placeholder="Reason (optional)" value={transferReason} onChange={(e) => setTransferReason(e.target.value)} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-sm" style={{ height: 36 }} onClick={handleTransfer} disabled={transferring || !transferAmount}>Send</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setTransferTarget(null)}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <WalletInner />
    </Suspense>
  );
}
