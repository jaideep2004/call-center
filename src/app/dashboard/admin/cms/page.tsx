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
type FaqItem = { question: string; answer: string };
type TestimonialItem = { name: string; role: string; quote: string };

function mdToHtml(md: string): string {
  let h = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // headings
  h = h.replace(/^### (.+)$/gm, "<h3 style='font-size:14px;font-weight:700;margin:10px 0 6px'>$1<\/h3>");
  h = h.replace(/^## (.+)$/gm, "<h2 style='font-size:16px;font-weight:800;margin:12px 0 6px'>$1<\/h2>");
  h = h.replace(/^# (.+)$/gm, "<h1 style='font-size:18px;font-weight:800;margin:12px 0 8px'>$1<\/h1>");
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1<\/strong>");
  h = h.replace(/\*(.+?)\*/g, "<em>$1<\/em>");
  h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "<a href='$2' target='_blank' rel='noreferrer' style='color:var(--accent)'>$1<\/a>");
  // unordered lists
  h = h.replace(/^(?:- |\* )(.+)$/gm, "<li style='margin-left:18px;list-style:disc'>$1<\/li>");
  h = h.replace(/(<li[^>]*>.*<\/li>)/gs, "<ul style='margin:6px 0'>$1<\/ul>");
  h = h.replace(/<\/ul>\s*<ul[^>]*>/g, "");
  // paragraphs / breaks
  h = h.replace(/\n{2,}/g, "</p><p style='margin:6px 0;line-height:1.6'>");
  h = h.replace(/\n/g, "<br/>");
  return `<p style='margin:6px 0;line-height:1.6'>${h}<\/p>`;
}

export default function AdminCmsPage() {
  const [sections, setSections] = useState<CmsSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [contentText, setContentText] = useState("{}");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  // structured states
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [testimonialItems, setTestimonialItems] = useState<TestimonialItem[]>([]);
  const [bodyText, setBodyText] = useState("");
  const [preview, setPreview] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/v1/cms/admin")
      .then(async (res) => {
        if (res.ok) {
          const body = await res.json();
          setSections(body.data ?? []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  function openSection(s: CmsSection) {
    setActiveSlug(s.slug);
    setTitle(s.title);
    const c = s.content as Record<string, unknown>;
    if (s.slug === "faq") {
      const raw = Array.isArray((c as { items?: unknown }).items) ? ((c as { items: unknown[] }).items as Record<string, unknown>[]) : [];
      setFaqItems(
        raw.length
          ? raw.map((it) => ({ question: String((it as Record<string, unknown>).question ?? (it as Record<string, unknown>).q ?? ""), answer: String((it as Record<string, unknown>).answer ?? (it as Record<string, unknown>).a ?? "") }))
          : []
      );
      setContentText(JSON.stringify(c, null, 2));
    } else if (s.slug === "testimonials") {
      const raw = Array.isArray((c as { items?: unknown }).items) ? ((c as { items: unknown[] }).items as Record<string, unknown>[]) : [];
      setTestimonialItems(
        raw.length
          ? raw.map((it) => ({ name: String((it as Record<string, unknown>).name ?? ""), role: String((it as Record<string, unknown>).role ?? ""), quote: String((it as Record<string, unknown>).quote ?? (it as Record<string, unknown>).text ?? "") }))
          : []
      );
      setContentText(JSON.stringify(c, null, 2));
    } else if (s.slug === "privacy" || s.slug === "terms") {
      setBodyText(String((c as { body?: unknown }).body ?? (typeof c === "string" ? c : "")));
      if (!((c as { body?: unknown }).body !== undefined)) {
        // if content is bare string or other shape, keep json fallback
        setContentText(JSON.stringify(c, null, 2));
      } else {
        setContentText(JSON.stringify(c, null, 2));
      }
    } else {
      setContentText(JSON.stringify(c, null, 2));
    }
  }

  function buildContent(): Record<string, unknown> | null {
    if (!activeSlug) return null;
    if (activeSlug === "faq") {
      // filter empties but allow save with 0 items
      return { items: faqItems.filter((it) => it.question.trim() || it.answer.trim()).map((it) => ({ question: it.question.trim(), answer: it.answer.trim() })) };
    }
    if (activeSlug === "testimonials") {
      return { items: testimonialItems.filter((it) => it.name.trim() || it.quote.trim()).map((it) => ({ name: it.name.trim(), role: it.role.trim(), quote: it.quote.trim() })) };
    }
    if (activeSlug === "privacy" || activeSlug === "terms") {
      return { body: bodyText };
    }
    try {
      return JSON.parse(contentText);
    } catch {
      showToast("Content is not valid JSON", "error");
      return null;
    }
  }

  async function save() {
    if (!activeSlug) return;
    const content = buildContent();
    if (content === null && activeSlug !== "faq" && activeSlug !== "testimonials" && activeSlug !== "privacy" && activeSlug !== "terms") return;
    // for structured slugs, buildContent never returns null except valid empty
    const finalContent = content as Record<string, unknown>;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/cms/admin?slug=${encodeURIComponent(activeSlug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: finalContent }),
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

  async function createSection() {
    const slug = newSlug.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) {
      showToast("Slug must be lowercase letters, numbers and hyphens", "error");
      return;
    }
    if (!newTitle.trim()) {
      showToast("Title required", "error");
      return;
    }
    setCreating(true);
    try {
      let seed: Record<string, unknown> = {};
      if (slug === "faq" || slug === "testimonials") seed = { items: [] };
      else if (slug === "privacy" || slug === "terms" || slug === "banner" || slug === "hero") seed = { body: "" };
      const res = await fetch("/api/v1/cms/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title: newTitle.trim(), content: seed }),
      });
      const body = await res.json();
      if (res.ok) {
        showToast("Section created", "success");
        setNewSlug("");
        setNewTitle("");
        refresh();
      } else {
        showToast(body.message ?? "Create failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setCreating(false);
    }
  }

  if (loading)
    return (
      <div className="dashboard-page">
        <div className="stack" style={{ gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-text" />
          ))}
        </div>
      </div>
    );

  const isStructuredFaq = activeSlug === "faq";
  const isTestimonials = activeSlug === "testimonials";
  const isBody = activeSlug === "privacy" || activeSlug === "terms";

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow">
            <i /> ADMIN / CMS
          </p>
          <h1>Content Management</h1>
          <p className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>FAQ &amp; Testimonials have structured editors — no JSON needed. Privacy/Terms use Markdown with preview. Other slugs keep JSON for now (hero on hold).</p>
        </div>
        <Link href="/dashboard/admin" className="btn btn-secondary">
          Back to Admin
        </Link>
      </div>

      <div className="split" style={{ "--gap": "1.5rem" } as React.CSSProperties}>
        <div className="card" style={{ flex: 1 }}>
          <h2>Sections</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Slug</th>
                <th>Title</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.id} style={s.slug === activeSlug ? { background: "var(--muted)" } : undefined}>
                  <td className="clickable text-mono-sm" onClick={() => openSection(s)}>
                    {s.slug}
                  </td>
                  <td className="clickable" onClick={() => openSection(s)}>
                    {s.title}
                  </td>
                  <td>
                    <button className={`btn btn-sm ${s.active ? "btn-secondary" : ""}`} onClick={() => toggleActive(s.slug, !s.active)} style={{ fontSize: 9 }}>
                      {s.active ? "Active" : "Hidden"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>+ New section</h3>
            <div className="stack" style={{ gap: 8 }}>
              <input className="input" value={newSlug} onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="slug e.g. banner (a-z, 0-9, -)" style={{ fontFamily: "var(--mono)", fontSize: 12 }} />
              <input className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title e.g. Homepage Banner" style={{ fontSize: 12 }} />
              <button className="btn btn-secondary btn-sm" onClick={createSection} disabled={creating}>
                {creating ? "Creating..." : "Create section"}
              </button>
              <span className="text-muted" style={{ fontSize: 10 }}>Creates immediately — you can edit right after. Slugs faq/testimonials/privacy/terms are seeded.</span>
            </div>
          </div>
        </div>

        {activeSlug && (
          <div className="card" style={{ flex: 1.4 }}>
            <h2>Edit /{activeSlug}</h2>
            <div className="stack" style={{ gap: 10, marginTop: "var(--space-3)" }}>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />

              {isStructuredFaq && (
                <div className="stack" style={{ gap: 12 }}>
                  {faqItems.length === 0 && <p className="text-muted" style={{ fontSize: 11 }}>No FAQs yet — add one below.</p>}
                  {faqItems.map((it, idx) => (
                    <div key={idx} className="card" style={{ padding: 12, background: "var(--muted)", border: "1px solid var(--border)" }}>
                      <div className="stack" style={{ gap: 6 }}>
                        <div className="stack-h" style={{ justifyContent: "space-between", alignItems: "center" }}>
                          <span className="text-mono-sm" style={{ fontWeight: 700 }}>#{idx + 1}</span>
                          <button
                            className="btn btn-sm"
                            onClick={() => setFaqItems((prev) => prev.filter((_, i) => i !== idx))}
                            style={{ fontSize: 10 }}
                          >
                            Remove
                          </button>
                        </div>
                        <input className="input" value={it.question} onChange={(e) => setFaqItems((prev) => prev.map((p, i) => (i === idx ? { ...p, question: e.target.value } : p)))} placeholder="Question" style={{ fontSize: 12 }} />
                        <textarea className="textarea" rows={3} value={it.answer} onChange={(e) => setFaqItems((prev) => prev.map((p, i) => (i === idx ? { ...p, answer: e.target.value } : p)))} placeholder="Answer" style={{ fontSize: 12 }} />
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={() => setFaqItems((prev) => [...prev, { question: "", answer: "" }])}>+ Add FAQ</button>
                </div>
              )}

              {isTestimonials && (
                <div className="stack" style={{ gap: 12 }}>
                  {testimonialItems.length === 0 && <p className="text-muted" style={{ fontSize: 11 }}>No testimonials yet — add one below.</p>}
                  {testimonialItems.map((it, idx) => (
                    <div key={idx} className="card" style={{ padding: 12, background: "var(--muted)", border: "1px solid var(--border)" }}>
                      <div className="stack" style={{ gap: 6 }}>
                        <div className="stack-h" style={{ justifyContent: "space-between", alignItems: "center" }}>
                          <span className="text-mono-sm" style={{ fontWeight: 700 }}>#{idx + 1}</span>
                          <button className="btn btn-sm" onClick={() => setTestimonialItems((prev) => prev.filter((_, i) => i !== idx))} style={{ fontSize: 10 }}>
                            Remove
                          </button>
                        </div>
                        <input className="input" value={it.name} onChange={(e) => setTestimonialItems((prev) => prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p)))} placeholder="Name" style={{ fontSize: 12 }} />
                        <input className="input" value={it.role} onChange={(e) => setTestimonialItems((prev) => prev.map((p, i) => (i === idx ? { ...p, role: e.target.value } : p)))} placeholder="Role / Company (optional)" style={{ fontSize: 12 }} />
                        <textarea className="textarea" rows={3} value={it.quote} onChange={(e) => setTestimonialItems((prev) => prev.map((p, i) => (i === idx ? { ...p, quote: e.target.value } : p)))} placeholder="Quote" style={{ fontSize: 12 }} />
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={() => setTestimonialItems((prev) => [...prev, { name: "", role: "", quote: "" }])}>+ Add testimonial</button>
                </div>
              )}

              {isBody && (
                <div className="stack" style={{ gap: 8 }}>
                  <div className="stack-h" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <span className="text-muted" style={{ fontSize: 10 }}>Markdown supported: # ## ###, **bold**, *italic*, - lists, [links](https://...)</span>
                    <button className="btn btn-sm btn-secondary" onClick={() => setPreview((v) => !v)} style={{ fontSize: 10 }}>
                      {preview ? "Edit" : "Preview"}
                    </button>
                  </div>
                  {!preview ? (
                    <textarea className="textarea" rows={18} value={bodyText} onChange={(e) => setBodyText(e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 12 }} placeholder="# Privacy Policy&#10;&#10;Your content here..." />
                  ) : (
                    <div className="card" style={{ minHeight: 240, maxHeight: 480, overflow: "auto", background: "white", color: "#111", padding: 14, border: "1px solid var(--border)", fontSize: 12 }} dangerouslySetInnerHTML={{ __html: mdToHtml(bodyText || "_Nothing yet_") }} />
                  )}
                </div>
              )}

              {!isStructuredFaq && !isTestimonials && !isBody && (
                <textarea className="textarea" rows={14} value={contentText} onChange={(e) => setContentText(e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 12 }} placeholder='{"items": []}' />
              )}

              <div className="stack-h" style={{ gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save & Publish"}
                </button>
                <span className="text-muted" style={{ fontSize: 10 }}>{isStructuredFaq || isTestimonials || isBody ? "Structured — no JSON needed. Changes go live immediately." : "Content must be valid JSON. Changes go live immediately."}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
