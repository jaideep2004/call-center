"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDuration } from "@/lib/format";
import { showToast } from "@/lib/use-toast";
import { DISPOSITION_OUTCOMES, DISPOSITION_LABELS } from "@/server/constants";

interface CallDetail {
  id: string;
  campaign_id: string;
  agent_id: string | null;
  provider: string;
  provider_call_id: string;
  state: string;
  from_hash: string | null;
  caller_state: string | null;
  started_at: string | null;
  connected_at: string | null;
  ended_at: string | null;
  routing_snapshot: Record<string, unknown>;
  qualification_snapshot: Record<string, unknown>;
  events: CallEvent[];
}

interface CallEvent {
  id: string;
  type: string;
  provider: string;
  raw_redacted: Record<string, unknown>;
  occurred_at: string;
}

interface Recording {
  id: string;
  storage_path: string;
  content_type: string;
  duration_seconds: number | null;
  created_at: string;
}

interface Disposition {
  id: string;
  outcome: string;
  notes: string | null;
  annual_premium_cents: number | null;
  admin_confirmed: boolean;
  created_at: string;
}

const OUTCOMES = DISPOSITION_OUTCOMES;

const OUTCOME_LABELS = DISPOSITION_LABELS;

const STATE_META: Record<string, { label: string; cls: string; icon: string }> = {
  received: { label: "Received", cls: "", icon: "○" },
  validating: { label: "Validating", cls: "", icon: "◎" },
  routing: { label: "Routing", cls: "", icon: "↻" },
  ringing: { label: "Ringing", cls: "", icon: "♪" },
  accepted: { label: "Accepted", cls: "badge-info", icon: "✓" },
  connecting: { label: "Connecting", cls: "badge-info", icon: "⟳" },
  connected: { label: "Connected", cls: "badge-success", icon: "●" },
  ended: { label: "Ended", cls: "", icon: "■" },
  failed: { label: "Failed", cls: "badge-danger", icon: "✕" },
  missed: { label: "Missed", cls: "badge-warning", icon: "◌" },
  cancelled: { label: "Cancelled", cls: "", icon: "—" },
  disputed: { label: "Disputed", cls: "badge-danger", icon: "⚠" },
};

function formatHash(hash: string | null): string {
  if (!hash) return "—";
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 12)}…`;
}

function AudioPlayer({ recording, onDelete }: { recording: Recording; onDelete?: () => void }) {
  return (
    <div className="audio-player">
      <div className="audio-player-meta">
        <span className="badge badge-info">{recording.content_type}</span>
        <span className="text-mono-sm">{formatDuration(recording.duration_seconds)}</span>
        <span className="text-mono-sm">{new Date(recording.created_at).toLocaleString()}</span>
      </div>
      <audio controls className="audio-element" preload="metadata">
        <source src={`/api/v1/recordings/${recording.id}/download`} type={recording.content_type} />
      </audio>
      <div className="audio-player-actions" style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <a href={`/api/v1/recordings/${recording.id}/download`} className="btn btn-secondary btn-sm" download>
          Download
        </a>
        {onDelete && (
          <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
        )}
      </div>
    </div>
  );
}

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [call, setCall] = useState<CallDetail | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [disposition, setDisposition] = useState<Disposition | null>(null);
  const [dispOutcome, setDispOutcome] = useState<string>(OUTCOMES[0]);
  const [dispNotes, setDispNotes] = useState("");
  const [dispPremium, setDispPremium] = useState("");
  const [dispSubmitting, setDispSubmitting] = useState(false);
  const [dispError, setDispError] = useState<string | null>(null);
  const [agentMeta, setAgentMeta] = useState<{ code: string; name: string } | null>(null);
  const [callNotes, setCallNotes] = useState<{ id: string; body: string; created_at: string }[]>([]);

  useEffect(() => {
    fetch(`/api/v1/calls/${id}`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setCall(body.data);
        if (body.data?.agent_id) {
          fetch(`/api/v1/agents/${body.data.agent_id}`).then(async (r) => {
            if (r.ok) {
              const b = await r.json();
              const a = b.data;
              if (a) setAgentMeta({ code: a.display_code ?? a.id.slice(0, 8), name: a.user_name ?? a.user_email ?? "" });
            }
          }).catch(() => {});
        }
      }
      setLoading(false);
    });
    fetch(`/api/v1/recordings?call_id=${encodeURIComponent(id)}`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        const list = body.data as Recording[];
        if (list.length > 0) setRecording(list[0]);
      }
    });
    fetch(`/api/v1/dispositions?call_id=${encodeURIComponent(id)}`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        const list = body.data as Disposition[];
        if (list.length > 0) setDisposition(list[0]);
      }
    });
    fetch(`/api/v1/calls/${id}/notes`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setCallNotes(body.data ?? []);
      }
    });
  }, [id]);

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  if (!call) return (
    <div className="dashboard-page">
      <div className="dashboard-page-header"><h1>Call not found</h1></div>
      <button className="btn btn-secondary" onClick={() => router.push("/dashboard/calls")}>Back to calls</button>
    </div>
  );

  const sm = STATE_META[call.state] ?? { label: call.state, cls: "", icon: "?" };
  const connectedSeconds = call.connected_at && call.ended_at
    ? Math.round((new Date(call.ended_at).getTime() - new Date(call.connected_at).getTime()) / 1000)
    : 0;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> CALLS / DETAIL</p>
          <div className="call-detail-title-row">
            <h1>Call {call.id.slice(0, 8)}</h1>
            <span className={`badge ${sm.cls}`} style={{ marginLeft: 12 }}>{sm.icon} {sm.label}</span>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => router.push("/dashboard/calls")}>Back</button>
      </div>

      <div className="call-detail-layout">
        <div className="call-detail-primary">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Overview</h2>
            </div>
            <div className="call-detail-grid">
              <div className="call-detail-field">
                <span className="call-detail-label">Caller</span>
                <span className="call-detail-value" title={call.from_hash ?? ""}>{formatHash(call.from_hash)}</span>
              </div>
              <div className="call-detail-field">
                <span className="call-detail-label">Caller State</span>
                <span className="call-detail-value"><span className="badge badge-info">{call.caller_state ?? "—"}</span></span>
              </div>
              <div className="call-detail-field">
                <span className="call-detail-label">Campaign</span>
                <span className="call-detail-value text-mono-sm">{call.campaign_id.slice(0, 12)}</span>
              </div>
              <div className="call-detail-field">
                <span className="call-detail-label">Provider</span>
                <span className="call-detail-value text-mono-sm">{call.provider}</span>
              </div>
              <div className="call-detail-field">
                <span className="call-detail-label">Provider Call ID</span>
                <span className="call-detail-value text-mono-sm">{call.provider_call_id.slice(0, 16)}</span>
              </div>
              <div className="call-detail-field">
                <span className="call-detail-label">Agent</span>
                <span className="call-detail-value text-mono-sm">{call.agent_id ? (agentMeta ? `${agentMeta.code} — ${agentMeta.name}` : `${call.agent_id.slice(0, 8)}…`) : "Unassigned"}</span>
              </div>
              <div className="call-detail-field">
                <span className="call-detail-label">Duration</span>
                <span className="call-detail-value text-mono-sm">{connectedSeconds > 0 ? formatDuration(connectedSeconds) : "—"}</span>
              </div>
              <div className="call-detail-field">
                <span className="call-detail-label">Started</span>
                <span className="call-detail-value text-mono-sm">{call.started_at ? new Date(call.started_at).toLocaleString() : "—"}</span>
              </div>
              <div className="call-detail-field">
                <span className="call-detail-label">Connected</span>
                <span className="call-detail-value text-mono-sm">{call.connected_at ? new Date(call.connected_at).toLocaleString() : "—"}</span>
              </div>
              <div className="call-detail-field">
                <span className="call-detail-label">Ended</span>
                <span className="call-detail-value text-mono-sm">{call.ended_at ? new Date(call.ended_at).toLocaleString() : "—"}</span>
              </div>
            </div>
          </div>

          {recording && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Recording</h2>
              </div>
              <AudioPlayer
                recording={recording}
                onDelete={async () => {
                  if (deleting) return;
                  setDeleting(true);
                  try {
                    const res = await fetch(`/api/v1/recordings/${recording.id}`, { method: "DELETE" });
                    if (res.ok) {
                      setRecording(null);
                      showToast("Recording deleted", "success");
                    } else {
                      showToast("Failed to delete recording", "error");
                    }
                  } catch {
                    showToast("Network error deleting recording", "error");
                  } finally {
                    setDeleting(false);
                  }
                }}
              />
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Disposition</h2>
            </div>
            {disposition ? (
              <div>
                <div className="call-disp-row">
                  <span className={`badge ${disposition.outcome === "sold" ? "badge-success" : ""}`}>{OUTCOME_LABELS[disposition.outcome] ?? disposition.outcome}</span>
                  {disposition.admin_confirmed ? (
                    <span className="badge badge-success" style={{ marginLeft: 8 }}>Confirmed</span>
                  ) : (
                    <span className="badge badge-warning" style={{ marginLeft: 8 }}>Pending Review</span>
                  )}
                </div>
                {disposition.notes && <p className="text-mono-sm" style={{ marginTop: 12 }}>{disposition.notes}</p>}
                {disposition.annual_premium_cents !== null && disposition.annual_premium_cents !== undefined && (
                  <p style={{ marginTop: 12, fontSize: 14 }}>Annual premium: <strong>${(disposition.annual_premium_cents / 100).toFixed(2)}</strong></p>
                )}
                <p className="text-muted" style={{ fontSize: 11, marginTop: 12 }}>Submitted {new Date(disposition.created_at).toLocaleString()}</p>
              </div>
            ) : call.state === "ended" ? (
              <div className="stack" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Outcome</label>
                  <select className="select" value={dispOutcome} onChange={(e) => { setDispOutcome(e.target.value); setDispPremium(""); }}>
                    {OUTCOMES.map((o) => <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>)}
                  </select>
                </div>
                {dispOutcome === "sold" && (
                  <div className="form-group">
                    <label className="form-label">Annual Premium (USD)</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ font: "16px var(--sans)", color: "var(--muted)" }}>$</span>
                      <input className="input" type="number" min="1" step="0.01" placeholder="0.00" value={dispPremium} onChange={(e) => setDispPremium(e.target.value)} style={{ maxWidth: 180 }} />
                    </div>
                    <span className="form-hint">Required for sold dispositions. Reported on leads and exports.</span>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="input" rows={3} value={dispNotes} onChange={(e) => setDispNotes(e.target.value)} placeholder="Optional notes..." />
                </div>
                {dispError && <p className="form-error">{dispError}</p>}
                <button
                  className="btn btn-primary"
                  disabled={dispSubmitting}
                  onClick={async () => {
                    setDispSubmitting(true);
                    setDispError(null);
                    try {
                      const premiumCents = dispPremium !== "" ? Math.round(parseFloat(dispPremium) * 100) : undefined;
                      if (dispOutcome === "sold" && (!premiumCents || premiumCents <= 0)) {
                        setDispError("Annual premium is required for sold dispositions");
                        setDispSubmitting(false);
                        return;
                      }
                      const res = await fetch(`/api/v1/calls/${id}/disposition`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ outcome: dispOutcome, notes: dispNotes || undefined, annual_premium_cents: premiumCents }),
                      });
                      const body = await res.json();
                      if (res.ok) {
                        setDisposition(body.data);
                        showToast("Disposition submitted", "success");
                      } else {
                        setDispError(body.message ?? "Failed to submit");
                        showToast(body.message ?? "Failed to submit disposition", "error");
                      }
                    } catch {
                      setDispError("Network error");
                      showToast("Network error submitting disposition", "error");
                    } finally {
                      setDispSubmitting(false);
                    }
                  }}
                >
                  {dispSubmitting ? "Submitting..." : "Submit Disposition"}
                </button>
              </div>
            ) : (
              <p className="text-muted">Awaiting call completion.</p>
            )}
          </div>

          {call.routing_snapshot && Object.keys(call.routing_snapshot).length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Routing</h2>
              </div>
              <pre className="call-detail-json">{JSON.stringify(call.routing_snapshot, null, 2)}</pre>
            </div>
          )}

          <div className="card">
            <div className="card-header"><h2 className="card-title">Agent Notes ({callNotes.length})</h2></div>
            {callNotes.length === 0 ? <p className="text-muted" style={{ fontSize: 12 }}>No notes yet. Notes saved in the softphone during the call appear here.</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {callNotes.map((n) => (
                  <div key={n.id} style={{ background: "rgba(168,85,247,0.06)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>{n.body}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
            {call.state === "connected" && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const body = prompt("Add a quick note for this call:");
                  if (!body?.trim()) return;
                  fetch(`/api/v1/calls/${id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: body.trim() }) }).then(async (r) => {
                    if (r.ok) { const b = await r.json(); setCallNotes((prev) => [...prev, b.data]); showToast("Note saved", "success"); } else showToast("Failed to save note", "error");
                  });
                }}>+ Add note</button>
                <button className="btn btn-warning btn-sm" onClick={async () => {
                  const res = await fetch(`/api/v1/calls/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: "disputed" }) });
                  if (res.ok) { setCall({ ...call, state: "disputed" } as any); showToast("Call marked as disputed — will appear in Admin → Disputes", "success"); } else { const b = await res.json().catch(() => ({})); showToast(b.message ?? "Failed to dispute", "error"); }
                }}>Mark disputed</button>
              </div>
            )}
          </div>

          {call.qualification_snapshot && Object.keys(call.qualification_snapshot).length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Qualification</h2>
              </div>
              <pre className="call-detail-json">{JSON.stringify(call.qualification_snapshot, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="call-detail-sidebar">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Events ({call.events.length})</h2>
            </div>
            <div className="timeline call-detail-timeline">
              {call.events.length === 0 ? (
                <p className="text-muted">No events recorded.</p>
              ) : (
                call.events.map((event) => (
                  <div key={event.id} className="timeline-item">
                    <time>{new Date(event.occurred_at).toLocaleTimeString()}</time>
                    <div className="call-event-content">
                      <span className={`badge ${event.type === "connected" ? "badge-success" : ""}${event.type === "ended" ? "" : ""}${event.type === "inbound" ? "badge-info" : ""}`}>{event.type}</span>
                      <p className="text-mono-sm" style={{ fontSize: 10, marginTop: 3, color: "var(--muted)" }}>{event.provider}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
