"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Tutorial {
  id: string;
  title: string;
  category: string;
  video_url: string | null;
  duration_seconds: number | null;
  tags: string[];
  created_at: string;
}

export default function TutorialsPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");

  const fetchTutorials = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    const res = await fetch(`/api/v1/tutorials?${params}`);
    if (res.ok) {
      const body = await res.json();
      setTutorials(body.data);
    }
    setLoading(false);
  }, [category]);

  useEffect(() => { fetchTutorials(); }, [fetchTutorials]);

  const categories = [...new Set(tutorials.map((t) => t.category))];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / TUTORIALS</p>
          <h1>Tutorials</h1>
        </div>
        <div className="search-bar">
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Link href="/dashboard/tutorials/new" className="btn btn-primary">+ New Tutorial</Link>
        </div>
      </div>
      {loading ? (
        <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : tutorials.length === 0 ? (
        <div className="empty-state"><p>No tutorials yet.</p></div>
      ) : (
        <div className="script-grid">
          {tutorials.map((t) => (
            <Link key={t.id} href={`/dashboard/tutorials/${t.id}`} className="card script-card">
              <div className="card-header">
                <span className="badge badge-info">{t.category}</span>
                {t.duration_seconds && <span className="text-mono-sm">{Math.floor(t.duration_seconds / 60)}:{String(t.duration_seconds % 60).padStart(2, "0")}</span>}
              </div>
              <h3 className="script-title">{t.title}</h3>
              <div className="script-meta">
                {t.tags.slice(0, 3).map((tag) => <span key={tag} className="badge">{tag}</span>)}
                {t.video_url && <span className="badge badge-success">video</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
