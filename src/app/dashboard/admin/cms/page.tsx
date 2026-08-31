"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { showToast } from "@/lib/use-toast";

interface CmsSection {
  id: string;
  slug: string;
  title: string;
  content: Record<string, unknown>;
  active: boolean;
  updated_at: string;
}

export default function AdminCmsPage() {
  const [sections, setSections] = useState<CmsSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [contentText, setContentText] = useState("{}");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/v1/cms/admin").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setSections(body.data ?? []);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  function openSection(s: CmsSection) {
    setActiveSlug(s.slug);
    setTitle(s.title);
    setContentText(JSON.stringify(s.content, null, 2));
  }

  async function save() {
    if (!activeSlug) return;
    let content: Record<string, unknown>;
    try {
      content = JSON.parse(contentText);
    } catch {
      showToast("Content is not valid JSON", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/cms/admin?slug=${encodeURIComponent(activeSlug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const body = await res.json();
      if (res.ok) {
        showToast("Section saved — live immediately", "success");
        refresh();
      } else {
        showToast(body.message ?? "Save failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(slug: string, active: boolean) {
    const res = await fetch(`/api/v1/cms/admin?slug=${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (res.ok) refresh();
  }

  if (loading) return <div className="dashboard-page"><div className="stack" style={{ gap: 12 }}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}</div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow"><i /> ADMIN / CMS</p>
          <h1>Content Management</h1>
        </div>
        <Link href="/dashboard/admin" className="btn btn-secondary">Back to Admin</Link>
      </div>

      <div className="split" style={{ "--gap": "1.5rem" } as React.CSSProperties}>
        <div className="card" style={{ flex: 1 }}>
          <h2>Sections</h2>
          <table className="table">
            <thead><tr><th>Slug</th><th>Title</th><th>Status</th></tr></thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.id}>
                  <td className="clickable text-mono-sm" onClick={() => openSection(s)}>{s.slug}</td>
                  <td className="clickable" onClick={() => openSection(s)}>{s.title}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${s.active ? "btn-secondary" : ""}`}
                      onClick={() => toggleActive(s.slug, !s.active)}
                      style={{ fontSize: 9 }}
                    >
                      {s.active ? "Active" : "Hidden"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {activeSlug && (
          <div className="card" style={{ flex: 1.4 }}>
            <h2>Edit /{activeSlug}</h2>
            <div className="stack" style={{ gap: 10, marginTop: "var(--space-3)" }}>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
              <textarea
                className="textarea"
                rows={14}
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                style={{ fontFamily: "var(--mono)", fontSize: 12 }}
                placeholder='{"items": []}'
              />
              <div className="stack-h" style={{ gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save & Publish"}
                </button>
                <span className="text-muted" style={{ fontSize: 10 }}>Content must be valid JSON. Changes go live immediately.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
