"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/use-toast";

export default function NewTutorialPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [videoUrl, setVideoUrl] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    if (!content.trim()) { setError("Content is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/tutorials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, content, category,
          video_url: videoUrl || undefined,
          duration_seconds: durationSeconds ? parseInt(durationSeconds) : undefined,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        const body = await res.json();
        showToast("Tutorial created", "success");
        router.push(`/dashboard/tutorials/${body.data.id}`);
      } else {
        const body = await res.json();
        setError(body.message);
        showToast(body.message ?? "Failed to create tutorial", "error");
      }
    } catch {
      setError("Network error");
      showToast("Network error creating tutorial", "error");
    }
    setSaving(false);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <p className="eyebrow"><i /> OPERATIONS / TUTORIALS / NEW</p>
        <h1>New Tutorial</h1>
      </div>
      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 640 }}>
        {error && <div className="error-banner"><p>{error}</p></div>}
        <div className="form-group">
          <label className="form-label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tutorial title" />
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="general">General</option>
            <option value="onboarding">Onboarding</option>
            <option value="product">Product</option>
            <option value="compliance">Compliance</option>
            <option value="soft_skills">Soft Skills</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Tags (comma-separated)</label>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2" />
        </div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 3 }}>
            <label className="form-label">Video URL</label>
            <input className="input" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Duration (sec)</label>
            <input className="input" type="number" value={durationSeconds} onChange={(e) => setDurationSeconds(e.target.value)} placeholder="120" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Content</label>
          <textarea className="textarea" rows={10} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Tutorial content..." />
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Create Tutorial"}</button>
          <button className="btn btn-ghost" type="button" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
