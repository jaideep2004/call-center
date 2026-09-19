"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { showToast } from "@/lib/use-toast";
import { getYoutubeId, isYoutubeUrl, youtubeEmbedUrl } from "@/lib/video";

interface Tutorial {
  id: string;
  title: string;
  content: string;
  category: string;
  video_url: string | null;
  duration_seconds: number | null;
  tags: string[];
  thumbnail_url: string | null;
  order_index: number;
  published: boolean;
  required: boolean;
  created_at: string;
  updated_at: string;
}

export default function TutorialDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ title: "", content: "", category: "general", video_url: "", duration_seconds: "", tags: "", thumbnail_url: "", order_index: "0", published: false, required: false });

  useEffect(() => {
    fetch(`/api/v1/tutorials/${id}`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setTutorial(body.data);
      }
      setLoading(false);
    });
    fetch("/api/v1/me").then(async (res) => {
      if (!res.ok) return;
      const body = await res.json();
      const role = body.data?.user?.role ?? body.data?.role;
      setCanManage(role === "agency" || role === "manager" || role === "admin" || role === "super_admin" || role === "finance");
    }).catch(() => {});
  }, [id]);

  function startEdit() {
    if (!tutorial) return;
    setDraft({
      title: tutorial.title,
      content: tutorial.content,
      category: tutorial.category,
      video_url: tutorial.video_url ?? "",
      duration_seconds: tutorial.duration_seconds != null ? String(tutorial.duration_seconds) : "",
      tags: (tutorial.tags ?? []).join(", "),
      thumbnail_url: tutorial.thumbnail_url ?? "",
      order_index: String(tutorial.order_index ?? 0),
      published: !!tutorial.published,
      required: !!tutorial.required,
    });
    setEditing(true);
  }

  async function handleSave() {
    if (!draft.title.trim()) { showToast("Title is required", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/tutorials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          content: draft.content,
          category: draft.category,
          video_url: draft.video_url || null,
          duration_seconds: draft.duration_seconds ? parseInt(draft.duration_seconds) : null,
          tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
          thumbnail_url: draft.thumbnail_url || null,
          order_index: draft.order_index ? parseInt(draft.order_index) : 0,
          published: draft.published,
          required: draft.required,
        }),
      });
      if (res.ok) {
        const body = await res.json();
        setTutorial(body.data);
        setEditing(false);
        showToast("Tutorial updated", "success");
      } else {
        const body = await res.json().catch(() => ({} as { message?: string }));
        showToast(body.message ?? "Save failed", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="dashboard-page"><div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div></div>;

  if (!tutorial) return <div className="dashboard-page"><div className="dashboard-page-header"><h1>Tutorial not found</h1></div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / TUTORIALS</p>
          <h1>{tutorial.title}</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canManage && !editing && <button className="btn btn-secondary" onClick={startEdit}>Edit</button>}
          <button className="btn btn-secondary" onClick={() => router.push("/dashboard/tutorials")}>Back</button>
        </div>
      </div>
      {editing ? (
        <div className="card" style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 12 }}>Title<input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ fontSize: 12 }}>Category<input className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></label>
            <label style={{ fontSize: 12 }}>Tags (comma-separated)<input className="input" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
            <label style={{ fontSize: 12 }}>Video URL (YouTube/Wistia embed or &lt;50MB MP4 upload via CMS)<input className="input" value={draft.video_url} onChange={(e) => setDraft({ ...draft, video_url: e.target.value })} /></label>
            <label style={{ fontSize: 12 }}>Duration (sec)<input className="input" type="number" value={draft.duration_seconds} onChange={(e) => setDraft({ ...draft, duration_seconds: e.target.value })} /></label>
          </div>
          <label style={{ fontSize: 12 }}>Thumbnail URL<input className="input" value={draft.thumbnail_url} onChange={(e) => setDraft({ ...draft, thumbnail_url: e.target.value })} placeholder="https://…" /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, alignItems: "flex-end" }}>
            <label style={{ fontSize: 12 }}>Order<input className="input" type="number" min={0} value={draft.order_index} onChange={(e) => setDraft({ ...draft, order_index: e.target.value })} /></label>
            <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center", paddingBottom: 8 }}>
              <input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} /> Published
            </label>
            <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center", paddingBottom: 8 }}>
              <input type="checkbox" checked={draft.required} onChange={(e) => setDraft({ ...draft, required: e.target.checked })} /> Required
            </label>
          </div>
          <label style={{ fontSize: 12 }}>Content<textarea className="textarea" rows={8} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} /></label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
      <div className="card" style={{ maxWidth: 720 }}>
        <div className="card-header">
          <span className="badge badge-info">{tutorial.category}</span>
          {tutorial.required && <span className="badge badge-warning">required</span>}
          {!tutorial.published && <span className="badge">draft</span>}
          <span className="text-mono-sm">Updated {new Date(tutorial.updated_at).toLocaleDateString()}</span>
        </div>
        {tutorial.tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: "var(--space-4)" }}>
            {tutorial.tags.map((t) => <span key={t} className="badge">{t}</span>)}
          </div>
        )}
        {tutorial.video_url && (
          <div style={{ marginBottom: "var(--space-4)", aspectRatio: "16/9", background: "#0d1714", borderRadius: "var(--radius-sm)", display: "grid", placeItems: "center", overflow: "hidden" }}>
            {isYoutubeUrl(tutorial.video_url) ? (
              <iframe
                src={youtubeEmbedUrl(getYoutubeId(tutorial.video_url)!)}
                title={tutorial.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: "100%", height: "100%", border: 0 }}
              />
            ) : (
              <video controls src={tutorial.video_url} style={{ width: "100%", height: "100%", borderRadius: "var(--radius-sm)" }} />
            )}
          </div>
        )}
        <div className="script-content" style={{ whiteSpace: "pre-wrap", font: "14px/1.7 var(--sans)", color: "#b9c7be" }}>
          {tutorial.content}
        </div>
      </div>
      )}
    </div>
  );
}
