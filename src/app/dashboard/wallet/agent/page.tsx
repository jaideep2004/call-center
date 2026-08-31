"use client";

import { useState, useEffect } from "react";
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

export default function AgentWalletPage() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [balance, setBalance] = useState(0);
  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState(500);
  const [toppingUp, setToppingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [earningsData, setEarningsData] = useState<EarningsDay[]>([]);

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

  const columns: Column<WalletEntry>[] = [
    { key: "type", header: "Type", render: (e) => <span className="badge">{e.type}</span> },
    {
      key: "amount_cents", header: "Amount",
      render: (e) => <span style={{ color: e.amount_cents > 0 ? "var(--accent)" : "var(--orange)" }}>{formatCents(e.amount_cents)}</span>,
    },
    { key: "call_id", header: "Call", render: (e) => <span className="text-mono-sm">{e.call_id?.slice(0, 8) ?? "—"}</span> },
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
      </div>

      <div className="agent-wallet-grid">
        <div className="card" style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p className="text-muted" style={{ fontSize: 11 }}>Available Balance</p>
            <p style={{ font: "500 48px/1 var(--serif)", margin: "4px 0", letterSpacing: "-0.05em" }}>{formatCents(balance)}</p>
            <p className="text-mono-sm" style={{ marginTop: 4 }}>+{formatCents(thisPeriod)} this week</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-lg" onClick={() => showToast("Payout requested", "success")}>Request Payout</button>
          </div>
        </div>

        {earningsData.length > 1 && (
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-head">
              <div>
                <span className="section-label">EARNINGS TREND</span>
                <h2>14 days</h2>
              </div>
            </div>
            <Sparkline data={earningsData.map((d) => d.earnings_cents)} width={600} height={48} />
          </div>
        )}

        <div className="card">
          <h2>Top Up</h2>
          <div className="filter-bar" style={{ marginTop: "var(--space-3)" }}>
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
        <DataTable
          columns={columns}
          data={entries}
          emptyMessage="No transactions yet."
          page={1}
          totalPages={1}
          total={entries.length}
          onPageChange={() => {}}
          sortBy=""
          order="desc"
          onSort={() => {}}
        />
      </div>
    </div>
  );
}
