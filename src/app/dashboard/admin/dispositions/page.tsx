"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/use-toast";
import { DISPOSITION_LABELS, DISPOSITION_COLORS } from "@/server/constants";

interface DispositionRow {
  id: string;
  call_id: string;
  agent_id: string;
  outcome: string;
  notes: string | null;
  admin_confirmed: boolean;
  created_at: string;
}

const OUTCOME_LABELS = DISPOSITION_LABELS;

const OUTCOME_COLORS = DISPOSITION_COLORS;

export default function AdminDispositionsPage() {
  const router = useRouter();
  const [dispositions, setDispositions] = useState<DispositionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    const endpoint = tab === "pending" ? "/api/v1/dispositions?status=pending" : "/api/v1/dispositions";
    fetch(endpoint).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setDispositions(body.data ?? []);
      }
      setLoading(false);
    });
  }, [tab]);

  const summary = useMemo(() => {
    const pending = dispositions.filter((d) => !d.admin_confirmed).length;
    const confirmed = dispositions.filter((d) => d.admin_confirmed).length;
    const perAgent: Record<string, { total: number; sold: number; pending: number }> = {};
    for (const d of dispositions) {
      const key = d.agent_id.slice(0, 8);
      const a = perAgent[key] ?? { total: 0, sold: 0, pending: 0 };
      a.total++;
      if (d.outcome === "sold") a.sold++;
      if (!d.admin_confirmed) a.pending++;
      perAgent[key] = a;
    }
    return { pending, confirmed, perAgent };
  }, [dispositions]);

  const handleConfirm = async (id: string) => {
    setConfirming(id);
    try {
      const res = await fetch(`/api/v1/dispositions/${id}/confirm`, { method: "PATCH" });
      if (res.ok) {
        setDispositions((prev) => prev.filter((d) => d.id !== id));
        showToast("Disposition confirmed", "success");
      } else {
        showToast("Failed to confirm disposition", "error");
      }
    } catch {
      showToast("Network error confirming disposition", "error");
    } finally {
      setConfirming(null);
    }
  };

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / DISPOSITIONS</p>
          <h1>Dispositions</h1>
        </div>
      </div>

      <div className="filter-bar">
        <button className={`btn btn-sm ${tab === "pending" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("pending")}>Pending Review</button>
        <button className={`btn btn-sm ${tab === "all" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("all")}>All</button>
      </div>

      {!loading && (
        <div className="card" style={{ display: "flex", gap: "var(--space-5)", flexWrap: "wrap", padding: "var(--space-4)" }}>
          <div><span className="text-muted" style={{ fontSize: 11 }}>Pending</span><p style={{ font: "500 24px/1 var(--mono)", color: "var(--orange)" }}>{summary.pending}</p></div>
          <div><span className="text-muted" style={{ fontSize: 11 }}>Confirmed</span><p style={{ font: "500 24px/1 var(--mono)", color: "var(--accent)" }}>{summary.confirmed}</p></div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <span className="text-muted" style={{ fontSize: 11 }}>Per-agent</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              {Object.entries(summary.perAgent).slice(0, 6).map(([agentKey, s]) => (
                <span key={agentKey} className="badge" style={{ fontSize: 10 }} title={`${agentKey}`}>{agentKey}: {s.sold}/{s.total}{s.pending > 0 ? ` (${s.pending}⏳)` : ""}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {dispositions.length === 0 ? (
        <p className="text-muted">No dispositions found.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Call</th>
              <th>Agent</th>
              <th>Outcome</th>
              <th>Notes</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {dispositions.map((d) => (
              <tr key={d.id}>
                <td className="text-mono-sm">{d.call_id.slice(0, 8)}</td>
                <td className="text-mono-sm">{d.agent_id.slice(0, 8)}</td>
                <td><span className={`badge ${OUTCOME_COLORS[d.outcome] ?? ""}`}>{OUTCOME_LABELS[d.outcome] ?? d.outcome}</span></td>
                <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{d.notes ?? "—"}</td>
                <td className="text-mono-sm">{new Date(d.created_at).toLocaleString()}</td>
                <td>
                  {!d.admin_confirmed && (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleConfirm(d.id)}
                      disabled={confirming === d.id}
                    >
                      {confirming === d.id ? "Confirming..." : "Confirm"}
                    </button>
                  )}
                  {d.admin_confirmed && <span className="badge badge-success">Confirmed</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
