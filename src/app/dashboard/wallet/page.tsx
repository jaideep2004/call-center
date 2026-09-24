"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
import Modal from "@/components/modal";
import { showToast } from "@/lib/use-toast";
import { stripeFeeCents } from "@/lib/format";

interface WalletEntry {
  id: string;
  type: string;
  amount_cents: number;
  currency: string;
  call_id: string | null;
  agent_id: string | null;
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
  // Ledger summary (last 500 entries) + direction/type filters for the table.
  const [summary, setSummary] = useState<{ inCents: number; outCents: number; total: number; fetched: number } | null>(null);
  const [dirFilter, setDirFilter] = useState<"all" | "in" | "out">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
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

  const refreshLedger = async () => {
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
  };

  // Ledger totals once per visit (last 500 entries) — not per page turn.
  useEffect(() => {
    fetch(`/api/v1/wallet/entries?page=1&limit=500`).then(async (res) => {
      if (!res.ok) return;
      const body = await res.json();
      const list: WalletEntry[] = body.data ?? [];
      let inCents = 0, outCents = 0;
      for (const e of list) {
        if (e.amount_cents > 0) inCents += e.amount_cents;
        else outCents += Math.abs(e.amount_cents);
      }
      setSummary({ inCents, outCents, total: body.pagination?.total ?? list.length, fetched: list.length });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/v1/wallet/agents")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) setAgents(body.data);
      })
      .catch(() => {});
  }, []);

  // Post-Stripe verification: the checkout returns ?payment=success (NOT
  // ?success=true — the old handler below never fired). Reconcile
  // (Stripe-verified) then refresh, so the ledger tells the truth.
  const [verifying, setVerifying] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      const sessionId = params.get("session_id");
      window.history.replaceState({}, "", window.location.pathname);
      const done = () => {
        setVerifying(false);
        fetch(`/api/v1/wallet/entries?page=1&limit=${PAGE_SIZE}`, { cache: "no-store" }).then(async (er) => {
          if (er.ok) setEntries((await er.json()).data ?? []);
        }).catch(() => {});
        fetch(`/api/v1/wallet/balance`, { cache: "no-store" }).then(async (br) => {
          if (br.ok) setBalance((await br.json()).data?.balance_cents ?? 0);
        }).catch(() => {});
      };
      if (!sessionId) {
        showToast("Payment received — balance updates shortly", "success");
        done();
        return;
      }
      setVerifying(true);
      fetch("/api/v1/payments/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      }).then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.ok && body.data?.credited) showToast("Top-up credited to the ledger", "success");
        else if (res.ok) showToast("Payment verified — ledger is up to date", "success");
        else showToast(body.message ?? "Payment pending — ledger updates shortly", "warning");
        done();
      }).catch(() => {
        showToast("Payment received — ledger updates shortly", "success");
        done();
      });
    } else if (params.get("payment") === "cancelled") {
      showToast("Payment canceled", "error");
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // Phase 4: the live checkout route is /create-checkout (the old
      // /recharge path never existed — this 404d). Response is {data:{url}}.
      const res = await fetch("/api/v1/wallet/create-checkout", {
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
        void refreshLedger();
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

  // Ledger filters apply to the loaded page; search narrows further.
  const typeOptions = useMemo(() => {
    const set = new Set(entries.map((e) => e.type));
    return ["all", ...Array.from(set).sort()];
  }, [entries]);
  const visibleEntries = useMemo(() => {
    const q = debouncedQ.trim().toLowerCase();
    return entries.filter((e) => {
      if (dirFilter === "in" && e.amount_cents <= 0) return false;
      if (dirFilter === "out" && e.amount_cents >= 0) return false;
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (q && !`${e.type} ${e.call_id ?? ""} ${e.provider_reference ?? ""} ${e.agent_id ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, dirFilter, typeFilter, debouncedQ]);

  const entryColumns: Column<WalletEntry>[] = [
    { key: "created_at", header: "Date", render: (e) => <span className="text-mono-sm" style={{ fontSize: 11, whiteSpace: "nowrap" }}>{new Date(e.created_at).toLocaleString()}</span> },
    {
      key: "direction", header: "Direction",
      render: (e) => e.amount_cents > 0
        ? <span className="cc-badge cc-badge--green">IN</span>
        : <span className="cc-badge cc-badge--red">OUT</span>,
    },
    { key: "type", header: "Type", render: (e) => <span className={`badge ${TYPE_COLORS[e.type] ?? ""}`}>{TYPE_LABELS[e.type] ?? e.type}</span> },
    {
      key: "agent_id", header: "Agent",
      render: (e) => <span className="text-mono-sm" style={{ fontSize: 11 }}>{e.agent_id ? e.agent_id.slice(0, 8) : <span className="text-muted">Agency</span>}</span>,
    },
    { key: "amount_cents", header: "Amount", render: (e) => <span className="text-mono-sm" style={{ color: e.amount_cents > 0 ? "var(--accent)" : "var(--orange)", fontWeight: 700, fontSize: 12 }}>{e.amount_cents > 0 ? "+" : "−"}{formatCents(Math.abs(e.amount_cents))}</span> },
    { key: "call_id", header: "Call", render: (e) => <span className="text-mono-sm" style={{ fontSize: 11 }}>{e.call_id?.slice(0, 8) ?? "—"}</span> },
    { key: "provider_reference", header: "Reference", render: (e) => <span className="text-mono-sm" style={{ fontSize: 11 }}>{e.provider_reference ? e.provider_reference.slice(0, 12) : "—"}</span> },
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
          <p className="eyebrow" style={{ margin: 0 }}><i /> FINANCE / LEDGER</p>
          <h1 style={{ margin: "4px 0 0" }}>Ledger</h1>
          <p className="text-muted" style={{ fontSize: 11, margin: "4px 0 0", maxWidth: 560, lineHeight: 1.5 }}>Central ledger for top-ups, charges and agent transfers — Plans/Fees set what to charge, Ledger shows the money movement and lets you fund agents.</p>
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
          {showRecharge && (
            <div className="card card--spacious">
              <h3 style={{ margin: "0 0 4px", font: "500 16px var(--serif)" }}>Top up</h3>
              <p className="text-muted" style={{ fontSize: 11, margin: "0 0 var(--space-4)" }}>Grouped presets + custom amount — checkout via Stripe. A 3% Stripe payment processing fee applies.</p>
              {(() => {
                const preview = selectedPreset ?? (customAmount ? Math.round(Number(customAmount) * 100) : 0);
                if (!preview || preview < 100) return null;
                const fee = stripeFeeCents(preview);
                return (
                  <p className="text-mono-sm" style={{ fontSize: 11, margin: "0 0 10px" }}>
                    {formatCents(preview)} credit + {formatCents(fee)} Stripe fee = {formatCents(preview + fee)} charged
                  </p>
                );
              })()}
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
              <span className="filter-bar__meta">
                {verifying ? "Verifying payment with Stripe…" : dirFilter === "all" && typeFilter === "all" && !debouncedQ.trim()
                  ? `${entries.length} shown · page ${page}/${totalPages}`
                  : `${visibleEntries.length} match filters`}
              </span>
            </div>
            {/* Money movement at a glance (last 500 of N entries) */}
            <div className="cc-metrics cc-metrics--5" style={{ marginTop: 14 }} aria-label="Ledger totals">
              <article className="cc-metric">
                <span className="cc-metric__label">Current Balance</span>
                <span className="cc-metric__value">{formatCents(balance)}</span>
                <span className="cc-metric__foot">USD · for top-up & transfers</span>
              </article>
              <article className="cc-metric">
                <span className="cc-metric__label">Money In</span>
                <span className="cc-metric__value" style={{ color: "var(--accent)" }}>{summary ? `+${formatCents(summary.inCents)}` : "—"}</span>
                <span className="cc-metric__foot">Top-ups · payouts in</span>
              </article>
              <article className="cc-metric">
                <span className="cc-metric__label">Money Out</span>
                <span className="cc-metric__value" style={{ color: "var(--orange)" }}>{summary ? `−${formatCents(summary.outCents)}` : "—"}</span>
                <span className="cc-metric__foot">Charges · transfers out</span>
              </article>
              <article className="cc-metric">
                <span className="cc-metric__label">Net Movement</span>
                <span className="cc-metric__value">{summary ? formatCents(summary.inCents - summary.outCents) : "—"}</span>
                <span className="cc-metric__foot">{summary ? `Last ${summary.fetched} of ${summary.total} entries` : "Loading…"}</span>
              </article>
            </div>
            {/* Direction + type filters (apply to the loaded page) */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
              <div style={{ display: "inline-flex", gap: 4, padding: 3, borderRadius: 9999, border: "1px solid var(--line)", background: "rgba(255,255,255,0.03)" }}>
                {(["all", "in", "out"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirFilter(d)}
                    style={{
                      border: 0, cursor: "pointer", borderRadius: 9999, padding: "6px 14px", fontSize: 11, fontWeight: dirFilter === d ? 700 : 500,
                      color: dirFilter === d ? "#fff" : "var(--muted)",
                      background: dirFilter === d ? "linear-gradient(135deg, #7C3AED, #A855F7)" : "transparent",
                    }}
                  >
                    {d === "all" ? "All" : d === "in" ? "Money In" : "Money Out"}
                  </button>
                ))}
              </div>
              <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ maxWidth: 190, fontSize: 11 }} aria-label="Filter by entry type">
                {typeOptions.map((t) => <option key={t} value={t}>{t === "all" ? "All types" : (TYPE_LABELS[t] ?? t)}</option>)}
              </select>
              {(dirFilter !== "all" || typeFilter !== "all") && (
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => { setDirFilter("all"); setTypeFilter("all"); }}>Clear</button>
              )}
            </div>
            {/* Filters apply to the loaded page: while any is active the table
                shows the filtered rows as one page so counts never lie. */}
            <div style={{ overflowX: "auto", marginTop: 12 }}>
            <DataTable
              columns={entryColumns}
              data={dirFilter === "all" && typeFilter === "all" && !debouncedQ.trim() ? entries : visibleEntries}
              emptyMessage="No transactions match these filters."
              page={dirFilter === "all" && typeFilter === "all" && !debouncedQ.trim() ? page : 1}
              totalPages={dirFilter === "all" && typeFilter === "all" && !debouncedQ.trim() ? totalPages : 1}
              total={dirFilter === "all" && typeFilter === "all" && !debouncedQ.trim() ? entries.length : visibleEntries.length}
              onPageChange={setPage}
              sortBy="created_at"
              order="desc"
              onSort={() => {}}
            />
            </div>
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
            <Modal label={`Transfer to ${transferTarget.name}`} onClose={() => setTransferTarget(null)}>
            <div className="card card--spacious" style={{ width: "min(480px, 100%)" }}>
              <h3 style={{ margin: "0 0 4px", font: "500 16px var(--serif)" }}>Transfer to {transferTarget.name}</h3>
              <p className="text-muted" style={{ fontSize: 11, margin: "0 0 var(--space-4)" }}>Internal ledger move — no Stripe charge. The amount leaves the agency balance and lands in the agent's wallet instantly.</p>
              <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
                <input className="input" type="number" placeholder="Amount $" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} />
                <input className="input" placeholder="Reason (optional)" value={transferReason} onChange={(e) => setTransferReason(e.target.value)} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-sm" style={{ height: 36 }} onClick={handleTransfer} disabled={transferring || !transferAmount}>Send</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setTransferTarget(null)}>Cancel</button>
                </div>
              </div>
            </div>
            </Modal>
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
