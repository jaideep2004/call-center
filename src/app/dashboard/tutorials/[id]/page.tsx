"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Tutorial {
  id: string;
  title: string;
  content: string;
  category: string;
  video_url: string | null;
  duration_seconds: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export default function TutorialDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/tutorials/${id}`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setTutorial(body.data);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="dashboard-page"><div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div></div>;

  if (!tutorial) return <div className="dashboard-page"><div className="dashboard-page-header"><h1>Tutorial not found</h1></div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / TUTORIALS</p>
          <h1>{tutorial.title}</h1>
        </div>
        <button className="btn btn-secondary" onClick={() => router.push("/dashboard/tutorials")}>Back</button>
      </div>
      <div className="card" style={{ maxWidth: 720 }}>
        <div className="card-header">
          <span className="badge badge-info">{tutorial.category}</span>
          <span className="text-mono-sm">Updated {new Date(tutorial.updated_at).toLocaleDateString()}</span>
        </div>
        {tutorial.tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: "var(--space-4)" }}>
            {tutorial.tags.map((t) => <span key={t} className="badge">{t}</span>)}
          </div>
        )}
        {tutorial.video_url && (
          <div style={{ marginBottom: "var(--space-4)", aspectRatio: "16/9", background: "#0d1714", borderRadius: "var(--radius-sm)", display: "grid", placeItems: "center" }}>
            <video controls src={tutorial.video_url} style={{ width: "100%", height: "100%", borderRadius: "var(--radius-sm)" }} />
          </div>
        )}
        <div className="script-content" style={{ whiteSpace: "pre-wrap", font: "14px/1.7 var(--sans)", color: "#b9c7be" }}>
          {tutorial.content}
        </div>
      </div>
    </div>
  );
}
