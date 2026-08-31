"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { showToast } from "@/lib/use-toast";

interface LeadDetail {
  id: string;
  email_hash: string | null;
  phone_hash: string | null;
  source: string | null;
  status: string;
  assigned_agent_id: string | null;
  created_at: string;
  updated_at: string;
}

interface TimelineEvent {
  id: string;
  type: string;
  body: Record<string, unknown>;
  actor_membership_id: string | null;
  created_at: string;
}

interface CallHistoryRow {
  id: string;
  state: string;
  started_at: string | null;
  connected_at: string | null;
  ended_at: string | null;
  from_hash: string | null;
  duration_seconds: number | null;
  disposition_outcome: string | null;
  annual_premium_cents: number | null;
  disposition_notes: string | null;
}

function formatDurationSec(sec: number | null) {
  if (sec === null || sec === undefined) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function formatTimelineEvent(type: string, body: Record<string, unknown>): string {
  if (type === "lead.created") return "Lead created";
  if (type === "lead.assigned") return `Assigned to agent ${body.agent_id ?? "unknown"}`;
  if (type === "lead.status_changed") return `Status changed to ${body.status ?? "unknown"}`;
  if (type === "lead.note_added") return "Note added";
  if (type === "lead.tag_added") return `Tag added: ${body.tag ?? "unknown"}`;
  if (type === "lead.tag_removed") return `Tag removed: ${body.tag ?? "unknown"}`;
  return type;
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState<{ id: string; content: string; created_at: string }[]>([]);
  const [calls, setCalls] = useState<CallHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState("");
  const [newNote, setNewNote] = useState("");
  const [status, setStatus] = useState("");

  const fetchData = () => {
    Promise.all([
      fetch(`/api/v1/leads/${id}`),
      fetch(`/api/v1/leads/${id}/timeline`),
      fetch(`/api/v1/leads/${id}/tags`),
      fetch(`/api/v1/leads/${id}/notes`),
      fetch(`/api/v1/leads/${id}/calls`),
    ]).then(async ([leadRes, tlRes, tagRes, noteRes, callRes]) => {
      if (leadRes.ok) { const b = await leadRes.json(); setLead(b.data); setStatus(b.data.status ?? ""); }
      if (tlRes.ok) { const b = await tlRes.json(); setTimeline(b.data); }
      if (tagRes.ok) { const b = await tagRes.json(); setTags(b.data); }
      if (noteRes.ok) { const b = await noteRes.json(); setNotes(b.data); }
      if (callRes.ok) { const b = await callRes.json(); setCalls(b.data); }
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, [id]);

  async function addTag() {
    if (!newTag.trim()) return;
    try {
      const res = await fetch(`/api/v1/leads/${id}/tags`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: newTag.trim() }),
      });
      if (res.ok) {
        setNewTag("");
        fetchData();
        showToast("Tag added", "success");
      } else {
        const body = await res.json();
        showToast(body.message ?? "Failed to add tag", "error");
      }
    } catch {
      showToast("Network error adding tag", "error");
    }
  }

  async function removeTag(tag: string) {
    try {
      const res = await fetch(`/api/v1/leads/${id}/tags?tag=${encodeURIComponent(tag)}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        showToast("Tag removed", "success");
      } else {
        const body = await res.json();
        showToast(body.message ?? "Failed to remove tag", "error");
      }
    } catch {
      showToast("Network error removing tag", "error");
    }
  }

  async function addNote() {
    if (!newNote.trim()) return;
    try {
      const res = await fetch(`/api/v1/leads/${id}/notes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.trim() }),
      });
      if (res.ok) {
        setNewNote("");
        fetchData();
        showToast("Note added", "success");
      } else {
        const body = await res.json();
        showToast(body.message ?? "Failed to add note", "error");
      }
    } catch {
      showToast("Network error adding note", "error");
    }
  }

  async function updateStatus(s: string) {
    try {
      const res = await fetch(`/api/v1/leads/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: s }),
      });
      if (res.ok) {
        setStatus(s);
        fetchData();
        showToast("Status updated", "success");
      } else {
        const body = await res.json();
        showToast(body.message ?? "Failed to update status", "error");
      }
    } catch {
      showToast("Network error updating status", "error");
    }
  }

  async function deleteLead() {
    if (!confirm("Delete this lead permanently?")) return;
    try {
      const res = await fetch(`/api/v1/leads/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard/leads");
        showToast("Lead deleted", "success");
      } else {
        const body = await res.json();
        showToast(body.message ?? "Failed to delete lead", "error");
      }
    } catch {
      showToast("Network error deleting lead", "error");
    }
  }

  if (loading) return (
    <div className="dashboard-page">
      <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
    </div>
  );

  if (!lead) return (
    <div className="dashboard-page">
      <div className="dashboard-page-header"><h1>Lead not found</h1></div>
      <button className="btn btn-secondary" onClick={() => router.push("/dashboard/leads")}>Back to leads</button>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> CRM / LEAD</p>
          <h1>Lead {lead.id.slice(0, 8)}</h1>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <button className="btn btn-danger btn-sm" onClick={deleteLead}>Delete</button>
          <button className="btn btn-secondary" onClick={() => router.push("/dashboard/leads")}>Back</button>
        </div>
      </div>
      <div className="detail-grid">
        <div>
          <div className="card detail-section">
            <h2>Details</h2>
            <dl className="data-list">
              <dt>Email hash</dt><dd className="text-mono-sm">{lead.email_hash ?? "—"}</dd>
              <dt>Phone hash</dt><dd className="text-mono-sm">{lead.phone_hash ?? "—"}</dd>
              <dt>Source</dt><dd><span className="badge">{lead.source ?? "direct"}</span></dd>
              <dt>Status</dt>
              <dd>
                <select className="input" style={{ width: 160, padding: "4px 8px", fontSize: 11 }} value={status} onChange={(e) => updateStatus(e.target.value)}>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                  <option value="disqualified">Disqualified</option>
                </select>
              </dd>
              <dt>Assigned agent</dt><dd className="text-mono-sm">{lead.assigned_agent_id ?? "Unassigned"}</dd>
              <dt>Created</dt><dd className="text-mono-sm">{new Date(lead.created_at).toLocaleString()}</dd>
              <dt>Updated</dt><dd className="text-mono-sm">{new Date(lead.updated_at).toLocaleString()}</dd>
            </dl>
          </div>

          <div className="card detail-section">
            <h2>Call History ({calls.length})</h2>
            {calls.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 12 }}>No calls recorded for this caller.</p>
            ) : (
              <table className="table" style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Duration</th>
                    <th>Disposition</th>
                    <th>Premium</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((c) => (
                    <tr key={c.id}>
                      <td className="text-mono-sm">{c.started_at ? new Date(c.started_at).toLocaleString() : "—"}</td>
                      <td className="text-mono-sm">{formatDurationSec(c.duration_seconds)}</td>
                      <td>{c.disposition_outcome ? <span className="badge">{c.disposition_outcome}</span> : <span className="text-muted">—</span>}</td>
                      <td className="text-mono-sm">{c.annual_premium_cents !== null && c.annual_premium_cents !== undefined ? `$${(c.annual_premium_cents / 100).toFixed(2)}` : "—"}</td>
                      <td style={{ textAlign: "right" }}><Link href={`/dashboard/calls/${c.id}`} className="text-mono-sm" style={{ color: "var(--cyan)" }}>View →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card detail-section">
            <h2>Tags</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "var(--space-3)" }}>
              {tags.length === 0 ? <span className="text-muted" style={{ fontSize: 12 }}>No tags</span> : tags.map((t) => (
                <span key={t} className="badge" style={{ cursor: "pointer" }} onClick={() => removeTag(t)}>{t} ×</span>
              ))}
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <input className="input" style={{ flex: 1, padding: "6px 10px", fontSize: 12 }} placeholder="Add tag..." value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} />
              <button className="btn btn-sm" onClick={addTag}>+</button>
            </div>
          </div>

          <div className="card detail-section">
            <h2>Notes</h2>
            {notes.map((n) => (
              <div key={n.id} style={{ padding: "var(--space-3) 0", borderBottom: "1px solid var(--line)" }}>
                <p style={{ fontSize: 13, margin: 0 }}>{n.content}</p>
                <small className="text-mono-sm">{new Date(n.created_at).toLocaleString()}</small>
              </div>
            ))}
            {notes.length === 0 && <p className="text-muted" style={{ fontSize: 12 }}>No notes yet.</p>}
            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <textarea className="input" style={{ flex: 1, padding: "6px 10px", fontSize: 12, minHeight: 40 }} placeholder="Add a note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} />
              <button className="btn btn-sm" style={{ alignSelf: "flex-end" }} onClick={addNote}>Add</button>
            </div>
          </div>
        </div>

        <div className="card detail-section">
          <h2>Timeline ({timeline.length})</h2>
          {timeline.length === 0 ? (
            <div className="empty-state"><p>No timeline events yet.</p></div>
          ) : (
            <div className="timeline">
              {timeline.map((event) => (
                <div key={event.id} className="timeline-item">
                  <time>{new Date(event.created_at).toLocaleTimeString()}</time>
                  <div className="event">
                    <span className="badge">{event.type}</span>
                    <p className="text-mono-sm" style={{ fontSize: 11, marginTop: 4 }}>{formatTimelineEvent(event.type, event.body)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
