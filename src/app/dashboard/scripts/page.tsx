"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Script {
  id: string;
  title: string;
  category: string;
  tags: string[];
  created_at: string;
}

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");

  const fetchScripts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    const res = await fetch(`/api/v1/scripts?${params}`);
    if (res.ok) {
      const body = await res.json();
      setScripts(body.data);
    }
    setLoading(false);
  }, [category]);

  useEffect(() => { fetchScripts(); }, [fetchScripts]);

  const categories = [...new Set(scripts.map((s) => s.category))];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / SCRIPTS</p>
          <h1>Scripts</h1>
        </div>
        <div className="search-bar">
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Link href="/dashboard/scripts/new" className="btn btn-primary">+ New Script</Link>
        </div>
      </div>
      {loading ? (
        <div className="stack" style={{ gap: 12 }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div>
      ) : scripts.length === 0 ? (
        <div className="empty-state"><p>No scripts yet.</p></div>
      ) : (
        <div className="script-grid">
          {scripts.map((s) => (
            <Link key={s.id} href={`/dashboard/scripts/${s.id}`} className="card script-card">
              <div className="card-header">
                <span className="badge badge-info">{s.category}</span>
              </div>
              <h3 className="script-title">{s.title}</h3>
              <div className="script-meta">
                {s.tags.slice(0, 3).map((t) => <span key={t} className="badge">{t}</span>)}
                <span className="text-mono-sm">{new Date(s.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
