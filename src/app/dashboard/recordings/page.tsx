"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDuration } from "@/lib/format";
import { showToast } from "@/lib/use-toast";

interface RecordingRow {
  id: string;
  call_id: string;
  storage_path: string;
  content_type: string;
  duration_seconds: number | null;
  created_at: string;
}

export default function RecordingsPage() {
  const router = useRouter();
  const [recordings, setRecordings] = useState<RecordingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/recordings").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setRecordings(body.data ?? []);
      }
      setLoading(false);
    });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recording?")) return;
    try {
      const res = await fetch(`/api/v1/recordings/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRecordings((prev) => prev.filter((r) => r.id !== id));
        showToast("Recording deleted", "success");
      } else {
        const body = await res.json().catch(() => ({}));
        showToast(body.message ?? "Failed to delete recording", "error");
      }
    } catch {
      showToast("Failed to delete recording", "error");
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
          <p className="eyebrow"><i /> RECORDINGS</p>
          <h1>Recordings</h1>
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Call recordings are stored when <code>campaign.record_calls=true</code> and your Telnyx Connection has <b>Record calls</b> enabled. Webhook <code>recording.saved</code> must reach <code>/api/telephony/telnyx/webhook</code>.</p>
        </div>
      </div>
      {recordings.length === 0 ? (
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          <p className="text-muted">No recordings found.</p>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 12, textAlign: "left", maxWidth: 640, margin: "12px auto 0" }}>
            <strong>Checklist if recordings should exist:</strong>
            <ol style={{ marginTop: 6, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>Admin → Campaigns → edit campaign → <code>Record calls: ON</code></li>
              <li>Telnyx Portal → Connections → your SIP Connection → <b>Record calls</b> = <b>ON</b> (Connections → Edit → Call Recording)</li>
              <li><code>APP_BASE_URL</code> is your public ngrok URL (<code>https://spaciously-protoplasmal-vivian.ngrok-free.dev</code>) so <code>recording.saved</code> reaches your server</li>
              <li>Make a &gt;15s connected call — recording appears ~30s after hangup here with Download</li>
              <li>Agent sees own recordings here too (same page; filtered by agency). Works without Telnyx when you test via mock provider — will be empty.</li>
            </ol>
          </div>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Call</th>
              <th>Type</th>
              <th>Duration</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recordings.map((r) => (
              <tr key={r.id}>
                <td className="text-mono-sm">{r.call_id.slice(0, 8)}</td>
                <td><span className="badge badge-info">{r.content_type}</span></td>
                <td>{formatDuration(r.duration_seconds)}</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td>
                  <div className="action-buttons">
                    <a href={`/api/v1/recordings/${r.id}/download`} className="btn btn-secondary btn-sm" download>Download</a>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
