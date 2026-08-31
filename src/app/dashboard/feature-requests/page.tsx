"use client";

import { useState, useEffect, useCallback } from "react";
import { showToast } from "@/lib/use-toast";
import { authClient } from "@/lib/auth-client";

interface FeatureRequestRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  votes: number;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_review: "In Review",
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  declined: "Declined",
};

const STATUS_COLORS: Record<string, string> = {
  open: "badge-info",
  in_review: "badge-warning",
  planned: "badge",
  in_progress: "badge-success",
  completed: "badge-success",
  declined: "badge-danger",
};

export default function FeatureRequestsPage() {
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = role === "admin" || role === "super_admin";
  const [requests, setRequests] = useState<FeatureRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"open" | "all">("open");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    const endpoint = tab === "open" ? "/api/v1/feature-requests?status=open" : "/api/v1/feature-requests";
    const res = await fetch(endpoint);
    if (res.ok) {
      const body = await res.json();
      setRequests(body.data ?? []);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    fetchRequests();
  }, [fetchRequests]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/feature-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
      });
      const body = await res.json();
      if (res.ok) {
        setTitle("");
        setDescription("");
        showToast("Feature request submitted", "success");
        fetchRequests();
      } else {
        showToast(body.message ?? "Failed to submit", "error");
      }
    } catch {
      showToast("Network error submitting feature request", "error");
    }
    setSubmitting(false);
  }

  async function handleVote(id: string) {
    if (voting) return;
    setVoting(id);
    try {
      const res = await fetch(`/api/v1/feature-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote: true }),
      });
      if (res.ok) {
        const body = await res.json();
        setRequests((prev) => prev.map((r) => (r.id === id ? body.data : r)));
        showToast("Vote recorded", "success");
      } else {
        showToast("Failed to vote", "error");
      }
    } catch {
      showToast("Network error voting", "error");
    }
    setVoting(null);
  }

  async function handleStatus(id: string, status: string) {
    const res = await fetch(`/api/v1/feature-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const body = await res.json();
      setRequests((prev) => prev.map((r) => (r.id === id ? body.data : r)));
      showToast("Status updated", "success");
    } else {
      showToast("Failed to update status", "error");
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> FEEDBACK / FEATURE REQUESTS</p>
          <h1>Feature Requests</h1>
        </div>
      </div>

      <section className="card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-5)" }}>
        <h2 style={{ font: "500 18px var(--serif)", margin: "0 0 var(--space-4)", letterSpacing: "-0.03em" }}>Suggest a feature</h2>
        <form onSubmit={handleSubmit} className="stack" style={{ gap: "var(--space-3)" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="fr-title">Title</label>
            <input id="fr-title" className="input" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Export calls to Excel" required maxLength={255} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="fr-desc">Description</label>
            <textarea id="fr-desc" className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should this feature do?" maxLength={5000} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={submitting || !title.trim()}>
              {submitting ? <span className="spinner" /> : "Submit"}
            </button>
          </div>
        </form>
      </section>

      <div className="filter-bar" style={{ marginBottom: "var(--space-4)" }}>
        <button className={`btn btn-sm ${tab === "open" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("open")}>Open</button>
        <button className={`btn btn-sm ${tab === "all" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("all")}>All</button>
      </div>

      {loading ? (
        <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : requests.length === 0 ? (
        <p className="text-muted">No feature requests found.</p>
      ) : (
        <div className="stack" style={{ gap: "var(--space-3)" }}>
          {requests.map((r) => (
            <div key={r.id} className="card" style={{ padding: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-4)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontSize: 15 }}>{r.title}</h3>
                    <span className={`badge ${STATUS_COLORS[r.status] ?? ""}`}>{STATUS_LABELS[r.status] ?? r.status}</span>
                  </div>
                  {r.description && <p className="text-muted" style={{ fontSize: 13, margin: "8px 0 0" }}>{r.description}</p>}
                  <p className="text-muted" style={{ fontSize: 11, marginTop: 8 }}>{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => handleVote(r.id)} disabled={voting === r.id}>
                    {r.votes} {r.votes === 1 ? "vote" : "votes"}
                  </button>
                  {isAdmin && (
                    <select
                      className="input"
                      value={r.status}
                      onChange={(e) => handleStatus(r.id, e.target.value)}
                      style={{ maxWidth: 140, fontSize: 12 }}
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
