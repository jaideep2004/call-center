"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { formatCents } from "@/lib/format";
import { showToast } from "@/lib/use-toast";
import Sparkline from "@/components/sparkline";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";

interface WalletEntry {
  id: string;
  type: string;
  amount_cents: number;
  created_at: string;
  call_id: string | null;
}

interface EarningsDay {
  date: string;
  earnings_cents: number;
}

function groupDailyEarnings(entries: WalletEntry[]): EarningsDay[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    if (e.amount_cents <= 0) continue;
    const day = e.created_at.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + e.amount_cents);
  }
  return Array.from(map.entries())
    .map(([date, earnings_cents]) => ({ date, earnings_cents }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
}

const PAGE_SIZE = 10;
const TYPE_COLORS: Record<string, string> = {
  earning: "badge-success", payout: "badge-info", top_up: "badge-success", charge: "badge-danger", transfer: "badge-info",
};

function AgentWalletInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [balance, setBalance] = useState(0);
  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toppingUp, setToppingUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(500);
  const [error, setError] = useState<string | null>(null);
  const [earningsData, setEarningsData] = useState<EarningsDay[]>([]);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const hasMounted = useRef(false);

  const refresh = () => {
    fetch("/api/v1/wallet/agent").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setBalance(body.data?.balance_cents ?? 0);
      }
      setLoading(false);
    });
    fetch("/api/v1/wallet/entries?limit=100").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        const list = body.data ?? [];
        setEntries(list);
        setEarningsData(groupDailyEarnings(list));
      }
    });
  };

  useEffect(refresh, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      showToast("Payment received — balance updates shortly", "success");
      window.history.replaceState({}, "", "/dashboard/wallet/agent");
      refresh();
    } else if (params.get("payment") === "cancelled") {
      showToast("Payment cancelled", "error");
      window.history.replaceState({}, "", "/dashboard/wallet/agent");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchInput.trim().toLowerCase();
      if (trimmed !== debouncedQ) { setDebouncedQ(trimmed); setPage(1); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, debouncedQ]);

  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return; }
    const p = new URLSearchParams();
    if (debouncedQ) p.set("q", debouncedQ);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    if (qs === searchParams.toString()) return;
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [debouncedQ, page, router, searchParams]);

  const handleTopUp = async () => {
    setToppingUp(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/wallet/agent/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_cents: topUpAmount }),
      });
      const body = await res.json();
      if (res.ok && body.data?.url) {
        window.location.href = body.data.url;
      } else {
        setError(body.message ?? "Could not start checkout");
        showToast(body.message ?? "Could not start checkout", "error");
        setToppingUp(false);
      }
    } catch {
      setError("Network error");
      showToast("Network error", "error");
      setToppingUp(false);
    }
  };

  const thisPeriod = entries
    .filter((e) => e.type === "earning" && new Date(e.created_at) > new Date(Date.now() - 7 * 86400000))
    .reduce((sum, e) => sum + e.amount_cents, 0);

  const filtered = useMemo(() => {
    if (!debouncedQ) return entries;
    const q = debouncedQ;
    return entries.filter((e) => e.type.toLowerCase().includes(q) || (e.call_id ?? "").toLowerCase().includes(q));
  }, [entries, debouncedQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const columns: Column<WalletEntry>[] = [
    { key: "type", header: "Type", render: (e) => <span className={`badge ${TYPE_COLORS[e.type] ?? ""}`}>{e.type}</span> },
    {
      key: "amount_cents", header: "Amount",
      render: (e) => <span style={{ color: e.amount_cents > 0 ? "var(--accent)" : "var(--orange)", fontWeight: 600 }}>{formatCents(e.amount_cents)}</span>,
    },
    { key: "call_id", header: "Call", render: (e) => <span className="text-mono-sm">{e.call_id?.slice(0, 8) ?? "\u2014"}</span> },
    { key: "created_at", header: "Date", render: (e) => <span className="text-mono-sm">{new Date(e.created_at).toLocaleString()}</span> },
  ];

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> AGENT / WALLET</p>
          <h1>My Wallet</h1>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search transactions..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ maxWidth: 180 }} />
        </div>
      </div>

      <nav className="tabs" style={{ marginBottom: "var(--space-4)" }}>
        <span className="tab active">Balance</span>
        <a className="tab" href="/dashboard/agents/subscription">Subscriptions</a>
      </nav>

      <div className="agent-wallet-grid">
        <div className="card" style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p className="text-muted" style={{ fontSize: 11 }}>Available Balance</p>
            <p style={{ font: "500 48px/1 var(--serif)", margin: "4px 0", letterSpacing: "-0.05em" }}>{formatCents(balance)}</p>
            <p className="text-mono-sm" style={{ marginTop: 4 }}>+{formatCents(thisPeriod)} this week</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a className="btn btn-sm" href="/dashboard/agents/subscription" style={{ whiteSpace: "nowrap" }}>View Subscriptions →</a>
          </div>
        </div>

        {earningsData.length > 1 && (
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-head">
              <div>
                <span className="section-label">EARNINGS TREND</span>
                <h2>14 days · {formatCents(earningsData.reduce((a, b) => a + b.earnings_cents, 0))} total</h2>
              </div>
            </div>
            <div style={{ overflowX: "auto", width: "100%" }}>
              <Sparkline data={earningsData.map((d) => d.earnings_cents)} width={600} height={48} responsive />
            </div>
          </div>
        )}

        <div className="card">
          <h2>Top Up</h2>
          <div className="filter-bar" style={{ marginTop: "var(--space-3)", flexWrap: "wrap" }}>
            {[100, 500, 1000, 2500, 5000].map((amt) => (
              <button
                key={amt}
                className={`btn btn-sm ${topUpAmount === amt ? "btn-primary" : ""}`}
                onClick={() => setTopUpAmount(amt)}
              >
                ${amt / 100}
              </button>
            ))}
            <button
              className="btn btn-primary btn-sm"
              onClick={handleTopUp}
              disabled={toppingUp}
            >
              {toppingUp ? "Starting checkout..." : `Pay $${topUpAmount / 100}`}
            </button>
          </div>
          {error && <p className="form-error" style={{ marginTop: 8 }}>{error}</p>}
        </div>
      </div>

      <div className="card" style={{ marginTop: "var(--space-6)" }}>
        <h2>Transaction History</h2>
        {filtered.length === 0 && entries.length === 0 ? (
          <div className="empty-state"><p>No transactions yet. Top up to get started or earn from calls.</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>No transactions match &quot;{debouncedQ}&quot;.</p></div>
        ) : (
          <div style={{ overflowX: "auto", marginTop: "var(--space-3)" }}>
            <DataTable
              columns={columns}
              data={paginated}
              emptyMessage="No transactions"
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              onPageChange={setPage}
              sortBy="created_at"
              order="desc"
              onSort={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentWalletPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <AgentWalletInner />
    </Suspense>
  );
}
