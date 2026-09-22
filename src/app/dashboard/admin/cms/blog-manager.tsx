"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { showToast } from "@/lib/use-toast";
import { renderMarkdown } from "@/lib/markdown";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image: string | null;
  category: string;
  tags: string[];
  author_name: string;
  author_role: string;
  author_avatar: string | null;
  read_minutes: number;
  featured: boolean;
  published: boolean;
  published_at: string | null;
  body_markdown: string;
  updated_at: string;
}

const EMPTY: BlogPost = {
  id: "",
  slug: "",
  title: "",
  excerpt: "",
  cover_image: "",
  category: "General",
  tags: [],
  author_name: "",
  author_role: "",
  author_avatar: "",
  read_minutes: 5,
  featured: false,
  published: false,
  published_at: null,
  body_markdown: "",
  updated_at: "",
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 120);
}

export default function BlogManager() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/v1/cms/admin/blog").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setPosts(body.data ?? []);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  function openNew() {
    setEditing({ ...EMPTY });
    setPreview(false);
  }

  function openEdit(p: BlogPost) {
    setEditing({ ...p, tags: [...p.tags] });
    setPreview(false);
  }

  function set<K extends keyof BlogPost>(key: K, value: BlogPost[K]) {
    setEditing((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!editing || saving) return;
    if (!editing.title.trim() || !editing.slug.trim()) {
      showToast("Title and slug are required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...editing,
        tags: editing.tags.map((t) => t.trim()).filter(Boolean),
        cover_image: editing.cover_image?.trim() || null,
        author_avatar: editing.author_avatar?.trim() || null,
      };
      const isNew = !editing.id;
      const res = await fetch(
        isNew ? "/api/v1/cms/admin/blog" : `/api/v1/cms/admin/blog/${editing.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isNew ? payload : { ...payload, id: undefined, slug: undefined }),
        },
      );
      const body = await res.json();
      if (res.ok) {
        showToast(isNew ? "Post created" : "Post updated", "success");
        setEditing(null);
        refresh();
      } else {
        showToast(body.message ?? "Save failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete this post? It will disappear from /blog immediately.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/v1/cms/admin/blog/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        showToast("Post deleted", "success");
        refresh();
      } else {
        showToast("Delete failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
    setDeletingId(null);
  }

  if (loading) {
    return (
      <div className="stack" style={{ gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-text" />)}
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
          {posts.length} post(s) · published posts are live at <Link href="/blog" className="clickable">/blog</Link> immediately.
        </p>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ New post</button>
      </div>

      {posts.length === 0 ? (
        <div className="card" style={{ padding: 24 }}>
          <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>No posts yet. Create the first one above.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Updated</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>
                    {p.title}
                    {p.featured && <span className="badge" style={{ marginLeft: 8, fontSize: 9 }}>FEATURED</span>}
                    <div className="text-mono-sm" style={{ color: "var(--muted)", fontSize: 10 }}>/blog/{p.slug}</div>
                  </td>
                  <td><span className="badge">{p.category}</span></td>
                  <td>
                    <span className={`badge${p.published ? " badge-success" : ""}`}>
                      {p.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="text-mono-sm" style={{ fontSize: 11 }}>
                    {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {p.published && (
                      <Link href={`/blog/${p.slug}`} className="btn btn-ghost btn-sm" style={{ marginRight: 6 }}>View</Link>
                    )}
                    <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => openEdit(p)}>Edit</button>
                    <button
                      className="btn btn-sm"
                      style={{ color: "var(--danger, #f87171)" }}
                      disabled={deletingId === p.id}
                      onClick={() => remove(p.id)}
                    >
                      {deletingId === p.id ? "…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 860 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{editing.id ? "Edit post" : "New post"}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>✕</button>
            </div>

            <div className="stack" style={{ gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "block" }}>
                  <span className="settings-label">Title *</span>
                  <input
                    className="input"
                    value={editing.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setEditing((prev) => {
                        if (!prev) return prev;
                        const autoSlug = !prev.id && (!prev.slug || prev.slug === slugify(prev.title));
                        return { ...prev, title, ...(autoSlug ? { slug: slugify(title) } : {}) };
                      });
                    }}
                  />
                </label>
                <label style={{ display: "block" }}>
                  <span className="settings-label">Slug *</span>
                  <input
                    className="input"
                    value={editing.slug}
                    onChange={(e) => set("slug", slugify(e.target.value))}
                    disabled={!!editing.id}
                    placeholder="my-post-title"
                  />
                </label>
              </div>

              <label style={{ display: "block" }}>
                <span className="settings-label">Excerpt</span>
                <textarea className="input" rows={2} value={editing.excerpt} onChange={(e) => set("excerpt", e.target.value)} maxLength={500} />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "block" }}>
                  <span className="settings-label">Category</span>
                  <input className="input" value={editing.category} onChange={(e) => set("category", e.target.value)} />
                </label>
                <label style={{ display: "block" }}>
                  <span className="settings-label">Tags (comma separated)</span>
                  <input
                    className="input"
                    value={editing.tags.join(", ")}
                    onChange={(e) => set("tags", e.target.value.split(","))}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "block" }}>
                  <span className="settings-label">Author name</span>
                  <input className="input" value={editing.author_name} onChange={(e) => set("author_name", e.target.value)} />
                </label>
                <label style={{ display: "block" }}>
                  <span className="settings-label">Author role</span>
                  <input className="input" value={editing.author_role} onChange={(e) => set("author_role", e.target.value)} />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "block" }}>
                  <span className="settings-label">Cover image URL</span>
                  <input className="input" value={editing.cover_image ?? ""} onChange={(e) => set("cover_image", e.target.value)} placeholder="https://…" />
                </label>
                <label style={{ display: "block" }}>
                  <span className="settings-label">Author avatar URL</span>
                  <input className="input" value={editing.author_avatar ?? ""} onChange={(e) => set("author_avatar", e.target.value)} placeholder="https://…" />
                </label>
              </div>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                  <input type="checkbox" checked={editing.published} onChange={(e) => set("published", e.target.checked)} />
                  Published (live at /blog)
                </label>
                <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                  <input type="checkbox" checked={editing.featured} onChange={(e) => set("featured", e.target.checked)} />
                  Featured hero
                </label>
                <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                  Read time (min)
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={120}
                    value={editing.read_minutes}
                    onChange={(e) => set("read_minutes", Math.max(1, Number(e.target.value) || 1))}
                    style={{ width: 70 }}
                  />
                </label>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span className="settings-label" style={{ margin: 0 }}>Body (markdown — ## headings build the table of contents)</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPreview((v) => !v)}>
                    {preview ? "Edit" : "Preview"}
                  </button>
                </div>
                {preview ? (
                  <div className="card" style={{ padding: 16, maxHeight: 380, overflow: "auto", background: "#0d0818" }}>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(editing.body_markdown || "_Nothing yet_") }} />
                  </div>
                ) : (
                  <textarea
                    className="input"
                    rows={14}
                    value={editing.body_markdown}
                    onChange={(e) => set("body_markdown", e.target.value)}
                    style={{ fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.6 }}
                    placeholder={"## Section heading\n\nBody text with **bold** and *italic*.\n\n- bullet one\n- bullet two\n\n> a pull-quote"}
                  />
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving ? "Saving…" : editing.id ? "Save changes" : "Create post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
