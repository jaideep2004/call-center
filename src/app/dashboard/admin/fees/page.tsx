"use client";

import { useState, useEffect, useCallback } from "react";
import { showToast } from "@/lib/use-toast";
import { formatCents } from "@/lib/format";

interface FeeRow {
  id: string;
  agent_id: string;
  agency_id: string;
  kind: "dialer" | "software";
  amount_cents: number;
  status: string;
  due_date: string;
  invoice_id: string | null;
  charged_at: string | null;
}

const KIND_LABELS: Record<string, string> = {
  dialer: "Dialer Fee",
  software: "Software Access",
};

export default function AdminFeesPage() {
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/v1/agent-fees").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setFees(body.data ?? []);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  async function act(id: string, action: "charge" | "waive") {
    setBusy(id);
    try {
      const res = await fetch(`/api/v1/agent-fees/${id}/${action}`, { method: "POST" });
      const body = await res.json();
      if (res.ok) {
        showToast(body.message ?? "Done", "success");
        refresh();
      } else {
        showToast(body.message ?? "Action failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setBusy(null);
    }
  }

  async function generateMonthly() {
    setBusy("monthly");
    try {
      const res = await fetch("/api/v1/agent-fees", { method: "POST" });
      const body = await res.json();
      showToast(res.ok ? `${body.data?.generated ?? 0} fee(s) generated` : (body.message ?? "Failed"), res.ok ? "success" : "error");
      if (res.ok) refresh();
    } finally {
      setBusy(null);
    }
  }

  async function generateWeekly() {
    setBusy("weekly");
    try {
      const res = await fetch("/api/v1/agent-fees/weekly", { method: "POST" });
      const body = await res.json();
      showToast(res.ok ? `${body.data?.invoices ?? 0} weekly invoice(s) generated` : (body.message ?? "Failed"), res.ok ? "success" : "error");
      if (res.ok) refresh();
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="stack" style={{ gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / FINANCE</p>
          <h1>Agent Fees</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={generateMonthly} disabled={busy !== null}>
            {busy === "monthly" ? "Generating..." : "Generate Monthly Fees"}
          </button>
          <button className="btn btn-primary" onClick={generateWeekly} disabled={busy !== null}>
            {busy === "weekly" ? "Generating..." : "Generate Weekly Invoices"}
          </button>
        </div>
      </div>

      <p className="text-muted" style={{ fontSize: 11, maxWidth: 640 }}>
        Postpaid agents: <strong>Dialer Fee</strong> (plan price, adjustable). Prepaid agents: <strong>Software Access</strong> (adjustable per agent).
        Weekly invoices are generated every Monday and must be sent to the agency manually.
      </p>

      <div className="card" style={{ marginTop: "var(--space-6)" }}>
        <h2>Pending Fees</h2>
        {fees.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 12, padding: "var(--space-4) 0" }}>
            No pending fees. Monthly generation runs on the 1st, or generate manually above.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Due</th>
                <th>Invoice</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((f) => (
                <tr key={f.id}>
                  <td className="text-mono-sm">{f.agent_id.slice(0, 8)}</td>
                  <td><span className={`badge ${f.kind === "dialer" ? "badge-warning" : "badge-info"}`}>{KIND_LABELS[f.kind] ?? f.kind}</span></td>
                  <td>{formatCents(f.amount_cents)}</td>
                  <td className="text-mono-sm">{f.due_date}</td>
                  <td className="text-mono-sm">{f.invoice_id ? f.invoice_id.slice(0, 8) : "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-sm btn-primary" disabled={busy === f.id} onClick={() => act(f.id, "charge")}>Charge</button>
                      <button className="btn btn-sm" disabled={busy === f.id} onClick={() => act(f.id, "waive")}>Waive</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
