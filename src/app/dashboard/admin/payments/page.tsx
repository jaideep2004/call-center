"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatCents } from "@/lib/format";
import { showToast } from "@/lib/use-toast";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";

interface Payment {
  id: string;
  agency_id: string;
  agent_id: string | null;
  plan_id: string | null;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  fee_cents: number;
  currency: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

function statusBadge(status: string) {
  if (status === "completed") return "cc-badge cc-badge--green";
  if (status === "pending") return "cc-badge cc-badge--purple";
  if (status === "failed" || status === "refunded") return "cc-badge cc-badge--red";
  return "cc-badge";
}

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [sessionInput, setSessionInput] = useState("");
  const [reconciling, setReconciling] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/v1/payments?limit=200").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setRows(body.data ?? []);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  async function verify(row: Payment) {
    setVerifying(row.id);
    try {
      const res = await fetch("/api/v1/payments/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: row.stripe_session_id }),
      });
      const body = await res.json();
      if (res.ok) {
        showToast(body.data?.credited ? `Credited ${formatCents(body.data.amount_cents ?? 0)}` : "Already completed — nothing to credit", "success");
        refresh();
      } else {
        showToast(body.message ?? "Verification failed", "error");
      }
    } catch {
      showToast("Network error verifying payment", "error");
    } finally {
      setVerifying(null);
    }
  }

  async function reconcileMissing(e: React.FormEvent) {
    e.preventDefault();
    const sessionId = sessionInput.trim();
    if (!sessionId) return;
    setReconciling(true);
    try {
      const res = await fetch("/api/v1/payments/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const body = await res.json();
      if (res.ok) {
        showToast(body.data?.credited ? `Recovered + credited ${formatCents(body.data.amount_cents ?? 0)}` : "Session verified — already credited", "success");
        setSessionInput("");
        refresh();
      } else {
        showToast(body.message ?? "Reconcile failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setReconciling(false);
    }
  }

  const completed = rows.filter((r) => r.status === "completed");
  const pending = rows.filter((r) => r.status === "pending");
  const totalNet = completed.reduce((a, r) => a + r.amount_cents, 0);
  const totalFees = completed.reduce((a, r) => a + (r.fee_cents ?? 0), 0);

  const columns: Column<Payment>[] = [
    {
      key: "created_at", header: "Date",
      render: (p) => <span className="text-mono-sm" style={{ fontSize: 11, whiteSpace: "nowrap" }}>{new Date(p.created_at).toLocaleString()}</span>,
    },
    {
      key: "amount_cents", header: "Credit / Fee",
      render: (p) => (
        <span style={{ fontSize: 12 }}>
          <strong>{formatCents(p.amount_cents)}</strong>
          <span className="text-muted"> + {formatCents(p.fee_cents ?? 0)} fee</span>
        </span>
      ),
    },
    {
      key: "agent_id", header: "Agent / Agency",
      render: (p) => (
        <span className="text-mono-sm" style={{ fontSize: 11 }}>
          {p.agent_id ? p.agent_id.slice(0, 8) : "pool/agency"}
          <span className="text-muted"> · {p.agency_id.slice(0, 8)}</span>
        </span>
      ),
    },
    {
      key: "status", header: "Status",
      render: (p) => <span className={statusBadge(p.status)}>{p.status}</span>,
    },
    {
      key: "stripe_session_id", header: "Stripe",
      render: (p) => (
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <span className="text-mono-sm" style={{ fontSize: 11 }}>{p.stripe_session_id.slice(0, 18)}…</span>
          <a
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 10, padding: "2px 8px" }}
            href={`https://dashboard.stripe.com/search?query=${encodeURIComponent(p.stripe_session_id)}`}
            target="_blank"
            rel="noreferrer"
          >
            Open ↗
          </a>
        </span>
      ),
    },
    {
      key: "id", header: "Verify",
      render: (p) => p.status === "pending" ? (
        <button className="btn btn-sm btn-secondary" style={{ fontSize: 10 }} disabled={verifying === p.id} onClick={() => verify(p)}>
          {verifying === p.id ? "Checking…" : "Verify"}
        </button>
      ) : <span className="text-muted" style={{ fontSize: 11 }}>—</span>,
    },
  ];

  return (
    <div className="dashboard-page cc-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / FINANCE</p>
          <h1 style={{ margin: "8px 0 0" }}>Payments</h1>
          <p className="text-muted" style={{ fontSize: 13, margin: "6px 0 0", maxWidth: 620 }}>
            Every Stripe top-up in one place. Pending rows that Stripe already charged can be verified + credited on the spot.
          </p>
        </div>
        <Link href="/dashboard/admin" className="btn btn-secondary">Back to Admin</Link>
      </div>

      <section className="cc-metrics cc-metrics--5" aria-label="Payment totals" style={{ marginBottom: "var(--space-4)" }}>
        <article className="cc-metric">
          <span className="cc-metric__label">Collected (net credit)</span>
          <span className="cc-metric__value">{formatCents(totalNet)}</span>
          <span className="cc-metric__foot">{completed.length} completed payments</span>
        </article>
        <article className="cc-metric">
          <span className="cc-metric__label">Processing fees (3%)</span>
          <span className="cc-metric__value">{formatCents(totalFees)}</span>
          <span className="cc-metric__foot">Passed through to payers</span>
        </article>
        <article className="cc-metric">
          <span className="cc-metric__label">Pending</span>
          <span className="cc-metric__value">{pending.length}</span>
          <span className="cc-metric__foot">{pending.length ? "Verify rows below" : "Nothing awaiting"}</span>
        </article>
      </section>

      <section className="card card--spacious" style={{ padding: 18, marginBottom: "var(--space-4)" }}>
        <h2 className="settings-card-title" style={{ fontSize: 14 }}>Recover a missing payment</h2>
        <p className="settings-card-sub">Paste a Stripe Checkout session id (starts with <span className="text-mono-sm">cs_</span>) — paid sessions are verified with Stripe and credited immediately.</p>
        <form onSubmit={reconcileMissing} style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <input
            className="input"
            value={sessionInput}
            onChange={(e) => setSessionInput(e.target.value)}
            placeholder="cs_live_… or cs_test_…"
            style={{ flex: 1, minWidth: 220, fontFamily: "var(--mono)", fontSize: 12 }}
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={reconciling || !sessionInput.trim()}>
            {reconciling ? "Verifying…" : "Verify + Credit"}
          </button>
        </form>
      </section>

      <section className="card card--spacious" style={{ padding: 18 }}>
        <h2 className="settings-card-title" style={{ fontSize: 14 }}>Payment history</h2>
        {loading ? (
          <div className="stack" style={{ gap: 8, marginTop: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state" style={{ padding: "24px 0" }}><p>No payments yet — top-ups will appear here.</p></div>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <DataTable
              columns={columns}
              data={rows}
              emptyMessage="No payments"
              page={1}
              totalPages={1}
              total={rows.length}
              onPageChange={() => {}}
              sortBy="created_at"
              order="desc"
              onSort={() => {}}
            />
          </div>
        )}
      </section>
    </div>
  );
}
