"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { formatDuration, formatTimer } from "@/lib/format";
import { showToast } from "@/lib/use-toast";
import DeviceTest from "@/components/device-test";

type Avail = "offline" | "available" | "busy" | "away";

interface CallRow {
  id: string;
  state: string;
  from_hash: string | null;
  caller_state: string | null;
  campaign_id: string;
  started_at: string | null;
  connected_at: string | null;
  ended_at: string | null;
}

interface AgentInfo {
  id: string;
  availability: string;
  approval_status: string;
  membership_id: string;
  forwarding_number: string | null;
  endpoint_types: string[];
  states: string[];
}

const STATUS_LABELS: Record<Avail, string> = {
  offline: "Offline",
  available: "Online",
  busy: "Busy",
  away: "Away",
};

const STATUS_COLORS: Record<Avail, string> = {
  offline: "var(--muted)",
  available: "var(--acid)",
  busy: "var(--orange)",
  away: "var(--yellow)",
};

export default function TakeCallsPage() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [availability, setAvailability] = useState<Avail>("offline");
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingAgent, setCreatingAgent] = useState(false);

  const loadAgent = useCallback(async () => {
    const res = await fetch("/api/v1/me");
    if (!res.ok) return;
    const body = await res.json();
    setMembershipId(body.data.membership?.id ?? null);
    const aid = body.data.agentId ?? null;
    setAgentId(aid);
    if (aid) {
      const agentRes = await fetch(`/api/v1/agents/${aid}`);
      if (agentRes.ok) {
        const agentBody = await agentRes.json();
        setAgentInfo(agentBody.data);
        setAvailability(agentBody.data.availability ?? "offline");
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadAgent().finally(() => setLoading(false));
  }, [user, loadAgent]);

  useEffect(() => {
    if (!agentId) return;
    fetch(`/api/v1/calls?agent_id=${encodeURIComponent(agentId)}&limit=10`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setCalls(body.data ?? []);
      }
    });
  }, [agentId]);

  const toggleAvailability = useCallback(async () => {
    if (!agentId || toggling) return;
    setToggling(true);
    setError(null);
    const next: Avail = availability === "available" ? "offline" : "available";
    try {
      const res = await fetch(`/api/v1/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: next }),
      });
      if (res.ok) {
        setAvailability(next);
        showToast(`You are now ${next === "available" ? "online" : "offline"}`, "success");
      } else {
        const body = await res.json();
        setError(body.message ?? "Failed to update status");
        showToast(body.message ?? "Failed to update status", "error");
      }
    } catch {
      setError("Network error");
      showToast("Network error updating availability", "error");
    } finally {
      setToggling(false);
    }
  }, [agentId, availability, toggling]);

  const autoCreateAgent = useCallback(async () => {
    setCreatingAgent(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agents/auto-create", { method: "POST" });
      if (res.ok) {
        showToast("Agent profile created! Reloading...", "success");
        await loadAgent();
      } else {
        const body = await res.json();
        setError(body.message ?? "Failed to create agent profile");
        showToast(body.message ?? "Failed to create agent profile", "error");
      }
    } catch {
      setError("Network error");
      showToast("Network error creating agent profile", "error");
    } finally {
      setCreatingAgent(false);
    }
  }, [loadAgent]);

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  const isOnline = availability === "available";
  const isApproved = agentInfo?.approval_status === "approved";

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> AGENT / TAKE CALLS</p>
          <h1>Take Calls</h1>
        </div>
      </div>

      <div className="take-calls-card">
        <div className="take-calls-status">
          <span className="take-calls-dot" style={{ background: STATUS_COLORS[availability] }} />
          <div>
            <p className="take-calls-label">Current Status</p>
            <p className="take-calls-value">{STATUS_LABELS[availability]}</p>
          </div>
        </div>
        {agentId ? (
          <button
            className={`btn ${isOnline ? "btn-danger" : "btn-success"} take-calls-toggle`}
            onClick={toggleAvailability}
            disabled={toggling || !isApproved}
          >
            {toggling ? "Updating..." : isOnline ? "Go Offline" : "Go Online"}
          </button>
        ) : (
          <button
            className="btn btn-primary take-calls-toggle"
            onClick={autoCreateAgent}
            disabled={creatingAgent}
          >
            {creatingAgent ? "Creating..." : "Create Agent Profile"}
          </button>
        )}
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <h2 style={{ marginBottom: 12 }}>Device Check</h2>
        <p className="text-muted" style={{ fontSize: 12, marginBottom: "var(--space-4)" }}>
          Verify your headset before going online. Grant mic access when prompted.
        </p>
        <DeviceTest compact />
      </div>

      {agentId && (
        <div className="card">
          <h2 style={{ marginBottom: 12 }}>Agent Status</h2>
          <div className="call-detail-grid">
            <div className="call-detail-field">
              <span className="call-detail-label">Approval</span>
              <span className="call-detail-value">
                {isApproved ? (
                  <span style={{ color: "var(--acid)" }}>Approved</span>
                ) : (
                  <span style={{ color: "#e89b79" }}>{agentInfo?.approval_status ?? "Unknown"} — Contact admin to approve</span>
                )}
              </span>
            </div>
            <div className="call-detail-field">
              <span className="call-detail-label">Online Status</span>
              <span className="call-detail-value" style={{ color: isOnline ? "var(--acid)" : "var(--muted)" }}>
                {STATUS_LABELS[availability]}
                {!isOnline && isApproved && <span style={{ color: "#e89b79", fontSize: 11, marginLeft: 8 }}>Turn on to receive calls</span>}
              </span>
            </div>
            <div className="call-detail-field">
              <span className="call-detail-label">Endpoint</span>
              <span className="call-detail-value text-mono-sm">{agentInfo?.endpoint_types?.join(", ") ?? "—"}</span>
            </div>
            <div className="call-detail-field">
              <span className="call-detail-label">Forwarding</span>
              <span className="call-detail-value text-mono-sm">{agentInfo?.forwarding_number ?? "Not set"}</span>
            </div>
          </div>
          {(!isApproved || !isOnline) && (
            <div className="error-banner" style={{ marginTop: 12 }}>
              <p>
                {!agentId ? "No agent profile. Click 'Create Agent Profile' above." :
                 !isApproved ? "Your agent profile needs admin approval before you can receive calls." :
                 !isOnline ? "You are offline. Click 'Go Online' to start receiving calls." :
                 "You are ready to receive calls."}
              </p>
            </div>
          )}
          {isApproved && isOnline && (
            <div className="error-banner" style={{ marginTop: 12, borderColor: "#465f57", background: "rgba(70,95,87,0.1)" }}>
              <p style={{ color: "#b9d7c3" }}>Ready to receive calls. Incoming calls will be routed to you.</p>
            </div>
          )}
        </div>
      )}

      {error && <p className="form-error" style={{ marginTop: 8 }}>{error}</p>}

      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Recent Calls</h2>
        {calls.length === 0 ? (
          <p className="text-muted">No calls yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Call</th>
                <th>Status</th>
                <th>From</th>
                <th>State</th>
                <th>Duration</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => {
                const duration = c.connected_at && c.ended_at
                  ? Math.round((new Date(c.ended_at).getTime() - new Date(c.connected_at).getTime()) / 1000)
                  : 0;
                return (
                  <tr key={c.id}>
                    <td><Link href={`/dashboard/calls/${c.id}`} className="clickable">{c.id.slice(0, 8)}</Link></td>
                    <td><span className={`badge${c.state === "connected" ? " badge-success" : ""}${c.state === "ended" ? "" : ""}`}>{c.state}</span></td>
                    <td className="text-mono-sm" title={c.from_hash ?? ""}>{c.from_hash?.slice(0, 12) ?? "—"}</td>
                    <td><span className="badge badge-info">{c.caller_state ?? "—"}</span></td>
                    <td>{duration > 0 ? formatDuration(duration) : "—"}</td>
                    <td className="text-mono-sm">{c.started_at ? new Date(c.started_at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
