"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Script {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export default function ScriptDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/scripts/${id}`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setScript(body.data);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="dashboard-page"><div className="stack" style={{ gap: 12 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div></div>;

  if (!script) return <div className="dashboard-page"><div className="dashboard-page-header"><h1>Script not found</h1></div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> OPERATIONS / SCRIPTS</p>
          <h1>{script.title}</h1>
        </div>
        <button className="btn btn-secondary" onClick={() => router.push("/dashboard/scripts")}>Back</button>
      </div>
      <div className="card" style={{ maxWidth: 720 }}>
        <div className="card-header">
          <span className="badge badge-info">{script.category}</span>
          <span className="text-mono-sm">Updated {new Date(script.updated_at).toLocaleDateString()}</span>
        </div>
        {script.tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: "var(--space-4)" }}>
            {script.tags.map((t) => <span key={t} className="badge">{t}</span>)}
          </div>
        )}
        <div className="script-content" style={{ whiteSpace: "pre-wrap", font: "14px/1.7 var(--sans)", color: "#b9c7be" }}>
          {script.content}
        </div>
      </div>
    </div>
  );
}
