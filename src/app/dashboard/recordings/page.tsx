"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DataTable from "@/components/data-table";
import type { Column } from "@/components/data-table";
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

const PAGE_SIZE = 10;

function RecordingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [recordings, setRecordings] = useState<RecordingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [page, setPage] = useState(initialPage);
  const hasMounted = useRef(false);

  useEffect(() => {
    fetch("/api/v1/recordings").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setRecordings(body.data ?? []);
      }
      setLoading(false);
    });
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

  const filtered = useMemo(() => {
    if (!debouncedQ) return recordings;
    const q = debouncedQ;
    return recordings.filter((r) =>
      r.call_id.toLowerCase().includes(q) ||
      r.content_type.toLowerCase().includes(q) ||
      r.storage_path.toLowerCase().includes(q)
    );
  }, [recordings, debouncedQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const columns: Column<RecordingRow>[] = [
    { key: "call_id", header: "Call", render: (r) => <span className="text-mono-sm" title={r.call_id}>{r.call_id.slice(0, 8)}</span> },
    { key: "content_type", header: "Type", render: (r) => <span className="badge badge-info">{r.content_type}</span> },
    { key: "duration_seconds", header: "Duration", render: (r) => <span className="text-mono-sm">{formatDuration(r.duration_seconds)}</span> },
    { key: "created_at", header: "Date", render: (r) => <span className="text-mono-sm">{new Date(r.created_at).toLocaleString()}</span> },
    {
      key: "actions", header: "Actions", className: "actions-cell",
      render: (r) => (
        <div className="stack-h" style={{ gap: 6, justifyContent: "flex-end" }}>
          <a href={`/api/v1/recordings/${r.id}/download`} className="btn btn-secondary btn-sm" style={{ whiteSpace: "nowrap" }} download>Download</a>
          <button className="btn btn-danger btn-sm" style={{ whiteSpace: "nowrap" }} onClick={() => handleDelete(r.id)}>Delete</button>
        </div>
      ),
    },
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
          <p className="eyebrow"><i /> RECORDINGS</p>
          <h1>Recordings</h1>
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, maxWidth: 720 }}>Call recordings are stored when <code>campaign.record_calls=true</code> and your Telnyx Connection has <b>Record calls</b> enabled. Webhook <code>recording.saved</code> must reach <code>/api/telephony/telnyx/webhook</code>.</p>
        </div>
        <div className="search-bar">
          <input className="input" type="search" placeholder="Search by call or type..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ minWidth: 220 }} />
          <span className="text-mono-sm" style={{ whiteSpace: "nowrap" }}>{filtered.length} total</span>
        </div>
      </div>
      {recordings.length === 0 ? (
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          <p className="text-muted">No recordings found.</p>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 12, textAlign: "left", maxWidth: 640, margin: "12px auto 0" }}>
            <strong>Checklist if recordings should exist:</strong>
            <ol style={{ marginTop: 6, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>Admin &rarr; Campaigns &rarr; edit campaign &rarr; <code>Record calls: ON</code></li>
              <li>Telnyx Portal &rarr; Connections &rarr; your SIP Connection &rarr; <b>Record calls</b> = <b>ON</b> (Connections &rarr; Edit &rarr; Call Recording)</li>
              <li><code>APP_BASE_URL</code> is your public ngrok URL so <code>recording.saved</code> reaches your server</li>
            </ol>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>No recordings match &quot;{debouncedQ}&quot;.</p></div>
      ) : (
        <DataTable
            columns={columns}
            data={paginated}
            emptyMessage="No recordings"
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            onPageChange={setPage}
            sortBy="created_at"
            order="desc"
            onSort={() => {}}
          />
      )}
    </div>
  );
}

export default function RecordingsPage() {
  return (
    <Suspense fallback={<div className="dashboard-page"><div className="skeleton skeleton-text" /></div>}>
      <RecordingsInner />
    </Suspense>
  );
}
