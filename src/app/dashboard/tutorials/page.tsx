"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Modal from "@/components/modal";
import { getYoutubeId, isYoutubeUrl, tutorialArtwork, youtubeEmbedUrl } from "@/lib/video";

interface Tutorial {
  id: string;
  title: string;
  category: string;
  video_url: string | null;
  duration_seconds: number | null;
  tags: string[];
  thumbnail_url: string | null;
  required: boolean;
  watched_percent: number | null;
  completed: boolean | null;
  created_at: string;
}

export default function TutorialsPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [playing, setPlaying] = useState<Tutorial | null>(null);
  const [progress, setProgress] = useState<Record<string, { watched_percent: number; completed: boolean }>>({});
  // + New Tutorial needs agents:manage — hide it for roles that would 403.
  const [canManage, setCanManage] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/v1/me").then(async (res) => {
      if (!res.ok) { setCanManage(false); return; }
      const body = await res.json();
      if (body.data?.publisherId || body.data?.publisher?.id) { setCanManage(false); return; }
      const role = body.data?.user?.role ?? null;
      setCanManage(role === "admin" || body.data?.isHead === true);
    }).catch(() => setCanManage(false));
  }, []);
  const lastSent = useRef<Record<string, number>>({});

  const fetchTutorials = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    const res = await fetch(`/api/v1/tutorials?${params}`);
    if (res.ok) {
      const body = await res.json();
      const rows: Tutorial[] = body.data ?? [];
      setTutorials(rows);
      const next: Record<string, { watched_percent: number; completed: boolean }> = {};
      for (const t of rows) {
        next[t.id] = { watched_percent: t.watched_percent ?? 0, completed: !!t.completed };
      }
      setProgress(next);
    }
    setLoading(false);
  }, [category]);

  useEffect(() => { fetchTutorials(); }, [fetchTutorials]);

  const categories = [...new Set(tutorials.map((t) => t.category))];

  async function sendProgress(tutorialId: string, watchedSeconds: number, watchedPercent: number, force = false) {
    const last = lastSent.current[tutorialId] ?? -1;
    if (!force && Math.abs(watchedPercent - last) < 10) return;
    lastSent.current[tutorialId] = watchedPercent;
    try {
      const res = await fetch(`/api/v1/tutorials/${tutorialId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watched_seconds: Math.round(watchedSeconds), watched_percent: Math.round(watchedPercent) }),
      });
      if (res.ok) {
        const body = await res.json();
        const row = body.data as { watched_percent: number; completed: boolean };
        setProgress((prev) => ({ ...prev, [tutorialId]: { watched_percent: row.watched_percent, completed: row.completed } }));
      }
    } catch { /* best-effort: progress resumes next session */ }
  }

  function handleTimeUpdate(tutorialId: string, el: HTMLVideoElement) {
    if (!el.duration || !Number.isFinite(el.duration)) return;
    const pct = (el.currentTime / el.duration) * 100;
    void sendProgress(tutorialId, el.currentTime, pct);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / TUTORIALS</p>
          <h1>Tutorials</h1>
        </div>
        <div className="search-bar">
          {canManage === true && (
            <Link href="/dashboard/tutorials/new" className="btn btn-primary">+ New Tutorial</Link>
          )}
        </div>
      </div>

      {categories.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }} role="tablist" aria-label="Categories">
          <button type="button" role="tab" aria-selected={category === ""} className={`badge ${category === "" ? "badge-success" : ""}`}
            onClick={() => setCategory("")} style={{ cursor: "pointer", border: 0 }}>All</button>
          {categories.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={category === c} className={`badge ${category === c ? "badge-success" : ""}`}
              onClick={() => setCategory(c)} style={{ cursor: "pointer", border: 0 }}>{c}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : tutorials.length === 0 ? (
        <div className="empty-state"><p>No tutorials yet.</p></div>
      ) : (
        <div className="script-grid">
          {tutorials.map((t) => {
            const p = progress[t.id] ?? { watched_percent: 0, completed: false };
            return (
              <div key={t.id} className="card script-card">
                {tutorialArtwork(t.thumbnail_url, t.video_url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tutorialArtwork(t.thumbnail_url, t.video_url)!} alt="" loading="lazy" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />
                ) : null}
                <div className="card-header">
                  <span className="badge badge-info">{t.category}</span>
                  {t.required && <span className="badge badge-warning">required</span>}
                  {p.completed && <span className="badge badge-success">completed ✓</span>}
                  {t.duration_seconds && <span className="text-mono-sm">{Math.floor(t.duration_seconds / 60)}:{String(t.duration_seconds % 60).padStart(2, "0")}</span>}
                </div>
                <h3 className="script-title">{t.title}</h3>
                {!p.completed && p.watched_percent > 0 && (
                  <div style={{ height: 4, borderRadius: 999, background: "var(--line)", margin: "6px 0" }} aria-label={`${p.watched_percent}% watched`}>
                    <div style={{ width: `${Math.min(100, p.watched_percent)}%`, height: "100%", borderRadius: 999, background: "var(--accent, #a855f7)" }} />
                  </div>
                )}
                <div className="script-meta">
                  {t.tags.slice(0, 3).map((tag) => <span key={tag} className="badge">{tag}</span>)}
                  {t.video_url && <span className="badge badge-success">video</span>}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {t.video_url ? (
                    <button className="btn btn-sm btn-primary" onClick={() => setPlaying(t)}>▶ Watch</button>
                  ) : null}
                  <Link href={`/dashboard/tutorials/${t.id}`} className="btn btn-sm btn-ghost">Details</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {playing?.video_url && (
        <Modal label={playing.title} onClose={() => setPlaying(null)}>
          <div className="card card--spacious" style={{ width: "min(720px, 100%)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <h2 style={{ margin: 0, font: "600 15px var(--serif)" }}>{playing.title}</h2>
              <button className="btn btn-sm btn-ghost" onClick={() => setPlaying(null)}>Close</button>
            </div>
            {isYoutubeUrl(playing.video_url) ? (
              <>
                <div style={{ aspectRatio: "16/9", background: "#000", borderRadius: 8, overflow: "hidden" }}>
                  <iframe
                    src={youtubeEmbedUrl(getYoutubeId(playing.video_url)!)}
                    title={playing.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ width: "100%", height: "100%", border: 0 }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      void sendProgress(playing.id, playing.duration_seconds ?? 0, 100, true).then(() => fetchTutorials());
                    }}
                  >
                    Mark complete
                  </button>
                  <span className="text-mono-sm" style={{ fontSize: 11, color: "var(--muted)" }}>
                    YouTube playback can&apos;t auto-report watch time — mark it done when finished.
                  </span>
                </div>
              </>
            ) : (
              <video
                key={playing.id}
                src={playing.video_url}
                controls
                autoPlay
                style={{ width: "100%", borderRadius: 8, background: "#000" }}
                onTimeUpdate={(e) => handleTimeUpdate(playing.id, e.currentTarget)}
                onEnded={(e) => {
                  const el = e.currentTarget;
                  void sendProgress(playing.id, el.duration || 0, 100, true).then(() => fetchTutorials());
                }}
              />
            )}
            <p className="text-mono-sm" style={{ fontSize: 11, color: "var(--muted)", margin: "8px 0 0" }}>
              Progress saves automatically · 90% marks completed (badge only — never blocks going live)
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
