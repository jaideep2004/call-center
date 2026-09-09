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
type PostItem = { title: string; slug: string; excerpt: string; body: string; image: string; author: string };
type CreativeItem = { title: string; image_url: string; link_url: string; placement: string };

function mdToHtml(md: string): string {
  let h = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  h = h.replace(/^### (.+)$/gm, "<h3 style='font-size:14px;font-weight:700;margin:10px 0 6px'>$1<\/h3>");
  h = h.replace(/^## (.+)$/gm, "<h2 style='font-size:16px;font-weight:800;margin:12px 0 6px'>$1<\/h2>");
  h = h.replace(/^# (.+)$/gm, "<h1 style='font-size:18px;font-weight:800;margin:12px 0 8px'>$1<\/h1>");
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1<\/strong>");
  h = h.replace(/\*(.+?)\*/g, "<em>$1<\/em>");
  h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "<a href='$2' target='_blank' rel='noreferrer' style='color:var(--accent)'>$1<\/a>");
  h = h.replace(/^(?:- |\* )(.+)$/gm, "<li style='margin-left:18px;list-style:disc'>$1<\/li>");
  h = h.replace(/(<li[^>]*>.*<\/li>)/gs, "<ul style='margin:6px 0'>$1<\/ul>");
  h = h.replace(/<\/ul>\s*<ul[^>]*>/g, "");
  h = h.replace(/\n{2,}/g, "</p><p style='margin:6px 0;line-height:1.6'>");
  h = h.replace(/\n/g, "<br/>");
  return `<p style='margin:6px 0;line-height:1.6'>${h}<\/p>`;
}

const QUICK_TYPES = [
  { slug: "faq", title: "FAQ", icon: "?", desc: "Questions & answers", color: "#7C3AED" },
  { slug: "testimonials", title: "Testimonials", icon: "★", desc: "Customer quotes", color: "#06B6D4" },
  { slug: "posts", title: "Blog Posts", icon: "◩", desc: "Articles & updates", color: "#F59E0B" },
  { slug: "creatives", title: "Creatives", icon: "◈", desc: "Banners & images", color: "#10B981" },
  { slug: "privacy", title: "Privacy", icon: "§", desc: "Legal markdown", color: "#8B5CF6" },
] as const;

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
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [testimonialItems, setTestimonialItems] = useState<TestimonialItem[]>([]);
  const [postItems, setPostItems] = useState<PostItem[]>([]);
  const [creativeItems, setCreativeItems] = useState<CreativeItem[]>([]);
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

  function getSection(slug: string) {
    return sections.find((s) => s.slug === slug);
  }

  async function ensureSection(slug: string, defaultTitle: string, seed: Record<string, unknown>) {
    const existing = getSection(slug);
    if (existing) {
      openSection(existing);
      document.getElementById(`edit-${slug}`)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    // create then open
    try {
      const res = await fetch("/api/v1/cms/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title: defaultTitle, content: seed }),
      });
      const body = await res.json();
      if (res.ok) {
        showToast(`${defaultTitle} section created`, "success");
        await refresh();
        // open after refresh
        setTimeout(() => {
          const s = { id: body.data?.id ?? "", slug, title: defaultTitle, content: seed, active: true, updated_at: new Date().toISOString() } as CmsSection;
          openSection(s);
        }, 200);
      } else {
        showToast(body.message ?? "Create failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  }

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
    } else if (s.slug === "posts" || s.slug === "blog") {
      const raw = Array.isArray((c as { items?: unknown }).items) ? ((c as { items: unknown[] }).items as Record<string, unknown>[]) : [];
      setPostItems(
        raw.length
          ? raw.map((it) => ({
              title: String((it as Record<string, unknown>).title ?? ""),
              slug: String((it as Record<string, unknown>).slug ?? ""),
              excerpt: String((it as Record<string, unknown>).excerpt ?? ""),
              body: String((it as Record<string, unknown>).body ?? ""),
              image: String((it as Record<string, unknown>).image ?? (it as Record<string, unknown>).image_url ?? ""),
              author: String((it as Record<string, unknown>).author ?? ""),
            }))
          : []
      );
      setContentText(JSON.stringify(c, null, 2));
    } else if (s.slug === "creatives" || s.slug === "banner" || s.slug === "banners") {
      const raw = Array.isArray((c as { items?: unknown }).items) ? ((c as { items: unknown[] }).items as Record<string, unknown>[]) : [];
      setCreativeItems(
        raw.length
          ? raw.map((it) => ({
              title: String((it as Record<string, unknown>).title ?? ""),
              image_url: String((it as Record<string, unknown>).image_url ?? (it as Record<string, unknown>).image ?? ""),
              link_url: String((it as Record<string, unknown>).link_url ?? (it as Record<string, unknown>).link ?? ""),
              placement: String((it as Record<string, unknown>).placement ?? "homepage"),
            }))
          : []
      );
      setContentText(JSON.stringify(c, null, 2));
    } else if (s.slug === "privacy" || s.slug === "terms") {
      setBodyText(String((c as { body?: unknown }).body ?? (typeof c === "string" ? c : "")));
      setContentText(JSON.stringify(c, null, 2));
    } else {
      setContentText(JSON.stringify(c, null, 2));
    }
  }

  function buildContent(): Record<string, unknown> | null {
    if (!activeSlug) return null;
    if (activeSlug === "faq") {
      return { items: faqItems.filter((it) => it.question.trim() || it.answer.trim()).map((it) => ({ question: it.question.trim(), answer: it.answer.trim() })) };
    }
    if (activeSlug === "testimonials") {
      return { items: testimonialItems.filter((it) => it.name.trim() || it.quote.trim()).map((it) => ({ name: it.name.trim(), role: it.role.trim(), quote: it.quote.trim() })) };
    }
    if (activeSlug === "posts" || activeSlug === "blog") {
      return {
        items: postItems
          .filter((it) => it.title.trim() || it.body.trim())
          .map((it) => ({
            title: it.title.trim(),
            slug: it.slug.trim() || it.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
            excerpt: it.excerpt.trim(),
            body: it.body.trim(),
            image: it.image.trim(),
            author: it.author.trim(),
          })),
      };
    }
    if (activeSlug === "creatives" || activeSlug === "banner" || activeSlug === "banners") {
      return {
        items: creativeItems
          .filter((it) => it.title.trim() || it.image_url.trim())
          .map((it) => ({
            title: it.title.trim(),
            image_url: it.image_url.trim(),
            link_url: it.link_url.trim(),
            placement: it.placement.trim() || "homepage",
          })),
      };
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
    if (content === null && activeSlug !== "faq" && activeSlug !== "testimonials" && activeSlug !== "privacy" && activeSlug !== "terms" && activeSlug !== "posts" && activeSlug !== "blog" && activeSlug !== "creatives" && activeSlug !== "banner" && activeSlug !== "banners") return;
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
      else if (slug === "posts" || slug === "blog") seed = { items: [] };
      else if (slug === "creatives" || slug === "banner" || slug === "banners") seed = { items: [] };
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
  const isPosts = activeSlug === "posts" || activeSlug === "blog";
  const isCreatives = activeSlug === "creatives" || activeSlug === "banner" || activeSlug === "banners";
  const isBody = activeSlug === "privacy" || activeSlug === "terms";

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <p className="eyebrow">
            <i /> ADMIN / CMS
          </p>
          <h1>Content Management</h1>
          <p className="text-muted" style={{ fontSize: 11, marginTop: 4, maxWidth: 640 }}>Manage homepage creatives, blog posts, FAQs and testimonials without code. Changes go live immediately.</p>
        </div>
        <Link href="/dashboard/admin" className="btn btn-secondary">
          Back to Admin
        </Link>
      </div>

      {/* Quick add */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: "var(--space-5)" }}>
        {QUICK_TYPES.map((t) => {
          const exists = sections.some((s) => s.slug === t.slug);
          const count = (() => {
            const s = sections.find((x) => x.slug === t.slug);
            if (!s) return 0;
            const c = s.content as Record<string, unknown>;
            if (Array.isArray((c as { items?: unknown }).items)) return ((c as { items: unknown[] }).items ?? []).length;
            return 1;
          })();
          return (
            <button
              key={t.slug}
              onClick={() => {
                if (t.slug === "posts") ensureSection("posts", "Blog Posts", { items: [] });
                else if (t.slug === "creatives") ensureSection("creatives", "Creatives", { items: [] });
                else if (t.slug === "faq") ensureSection("faq", "FAQ", { items: [] });
                else if (t.slug === "testimonials") ensureSection("testimonials", "Testimonials", { items: [] });
                else ensureSection(t.slug, t.title, { body: "" });
              }}
              className="card"
              style={{ padding: "14px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left", border: exists ? "1px solid var(--line)" : "1px dashed var(--line)", opacity: exists ? 1 : 0.9 }}
            >
              <span style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", background: `${t.color}18`, border: `1px solid ${t.color}30`, color: t.color, fontWeight: 800, fontSize: 14 }}>{t.icon}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1 }}>{t.title}</div>
                <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>{exists ? `${count} item${count === 1 ? "" : "s"} • click to edit` : t.desc}</div>
              </div>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>{exists ? "Edit →" : "+ Add"}</span>
            </button>
          );
        })}
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
                <tr key={s.id} style={s.slug === activeSlug ? { background: "rgba(168,85,247,0.08)" } : undefined}>
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
              {sections.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-muted" style={{ textAlign: "center", padding: 16, fontSize: 12 }}>
                    No sections yet — use Quick add above or create custom below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>+ New custom section</h3>
            <div className="stack" style={{ gap: 8 }}>
              <input className="input" value={newSlug} onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="slug e.g. banner (a-z, 0-9, -)" style={{ fontFamily: "var(--mono)", fontSize: 12 }} />
              <input className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title e.g. Homepage Banner" style={{ fontSize: 12 }} />
              <button className="btn btn-secondary btn-sm" onClick={createSection} disabled={creating}>
                {creating ? "Creating..." : "Create custom section"}
              </button>
              <span className="text-muted" style={{ fontSize: 10 }}>For advanced use — most teams use Quick add above. Slugs faq/testimonials/posts/creatives/privacy/terms are seeded.</span>
            </div>
          </div>
        </div>

        {activeSlug && (
          <div className="card" style={{ flex: 1.4 }} id={`edit-${activeSlug}`}>
            <h2>Edit /{activeSlug}</h2>
            <div className="stack" style={{ gap: 10, marginTop: "var(--space-3)" }}>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />

              {isStructuredFaq && (
                <div className="stack" style={{ gap: 12 }}>
                  {faqItems.length === 0 && <p className="text-muted" style={{ fontSize: 11 }}>No FAQs yet — add one below.</p>}
                  {faqItems.map((it, idx) => (
                    <div key={idx} className="card" style={{ padding: 12, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
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
                        <input className="input" value={it.question} onChange={(e) => setFaqItems((prev) => prev.map((p, i) => (i === idx ? { ...p, question: e.target.value } : p)))} placeholder="Question (e.g. How does Coverage Calls work?)" style={{ fontSize: 12 }} />
                        <textarea className="textarea" rows={3} value={it.answer} onChange={(e) => setFaqItems((prev) => prev.map((p, i) => (i === idx ? { ...p, answer: e.target.value } : p)))} placeholder="Answer (supports **bold** and [links](https://...))" style={{ fontSize: 12 }} />
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
                    <div key={idx} className="card" style={{ padding: 12, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                      <div className="stack" style={{ gap: 6 }}>
                        <div className="stack-h" style={{ justifyContent: "space-between", alignItems: "center" }}>
                          <span className="text-mono-sm" style={{ fontWeight: 700 }}>#{idx + 1}</span>
                          <button className="btn btn-sm" onClick={() => setTestimonialItems((prev) => prev.filter((_, i) => i !== idx))} style={{ fontSize: 10 }}>
                            Remove
                          </button>
                        </div>
                        <input className="input" value={it.name} onChange={(e) => setTestimonialItems((prev) => prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p)))} placeholder="Name — e.g. Sarah M." style={{ fontSize: 12 }} />
                        <input className="input" value={it.role} onChange={(e) => setTestimonialItems((prev) => prev.map((p, i) => (i === idx ? { ...p, role: e.target.value } : p)))} placeholder="Role / Company — e.g. Agency Owner" style={{ fontSize: 12 }} />
                        <textarea className="textarea" rows={3} value={it.quote} onChange={(e) => setTestimonialItems((prev) => prev.map((p, i) => (i === idx ? { ...p, quote: e.target.value } : p)))} placeholder="Quote — e.g. Coverage Calls doubled our close rate." style={{ fontSize: 12 }} />
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={() => setTestimonialItems((prev) => [...prev, { name: "", role: "", quote: "" }])}>+ Add testimonial</button>
                </div>
              )}

              {isPosts && (
                <div className="stack" style={{ gap: 12 }}>
                  {postItems.length === 0 && <p className="text-muted" style={{ fontSize: 11 }}>No posts yet — add one below. Posts appear on /why-choose-us or blog if wired.</p>}
                  {postItems.map((it, idx) => (
                    <div key={idx} className="card" style={{ padding: 12, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                      <div className="stack" style={{ gap: 8 }}>
                        <div className="stack-h" style={{ justifyContent: "space-between" }}>
                          <span className="text-mono-sm" style={{ fontWeight: 700 }}>#{idx + 1}</span>
                          <button className="btn btn-sm" onClick={() => setPostItems((prev) => prev.filter((_, i) => i !== idx))} style={{ fontSize: 10 }}>Remove</button>
                        </div>
                        <input className="input" value={it.title} onChange={(e) => setPostItems((prev) => prev.map((p, i) => (i === idx ? { ...p, title: e.target.value } : p)))} placeholder="Title — e.g. 5 tips for inbound" style={{ fontSize: 12 }} />
                        <input className="input" value={it.slug} onChange={(e) => setPostItems((prev) => prev.map((p, i) => (i === idx ? { ...p, slug: e.target.value } : p)))} placeholder="Slug — e.g. 5-tips-inbound (auto from title if empty)" style={{ fontSize: 12, fontFamily: "var(--mono)" }} />
                        <input className="input" value={it.excerpt} onChange={(e) => setPostItems((prev) => prev.map((p, i) => (i === idx ? { ...p, excerpt: e.target.value } : p)))} placeholder="Excerpt — one-line summary" style={{ fontSize: 12 }} />
                        <input className="input" value={it.image} onChange={(e) => setPostItems((prev) => prev.map((p, i) => (i === idx ? { ...p, image: e.target.value } : p)))} placeholder="Image URL — e.g. https://.../cover.jpg" style={{ fontSize: 12 }} />
                        {it.image && <img src={it.image} alt="" style={{ maxWidth: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />}
                        <input className="input" value={it.author} onChange={(e) => setPostItems((prev) => prev.map((p, i) => (i === idx ? { ...p, author: e.target.value } : p)))} placeholder="Author — e.g. Coverage Team" style={{ fontSize: 12 }} />
                        <textarea className="textarea" rows={4} value={it.body} onChange={(e) => setPostItems((prev) => prev.map((p, i) => (i === idx ? { ...p, body: e.target.value } : p)))} placeholder="Body — markdown supported (# ##, **bold**, lists)" style={{ fontSize: 12 }} />
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={() => setPostItems((prev) => [...prev, { title: "", slug: "", excerpt: "", body: "", image: "", author: "" }])}>+ Add post</button>
                </div>
              )}

              {isCreatives && (
                <div className="stack" style={{ gap: 12 }}>
                  {creativeItems.length === 0 && <p className="text-muted" style={{ fontSize: 11 }}>No creatives yet — add a banner. Creatives are used on homepage / ads.</p>}
                  {creativeItems.map((it, idx) => (
                    <div key={idx} className="card" style={{ padding: 12, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                      <div className="stack" style={{ gap: 8 }}>
                        <div className="stack-h" style={{ justifyContent: "space-between" }}>
                          <span className="text-mono-sm" style={{ fontWeight: 700 }}>#{idx + 1}</span>
                          <button className="btn btn-sm" onClick={() => setCreativeItems((prev) => prev.filter((_, i) => i !== idx))} style={{ fontSize: 10 }}>Remove</button>
                        </div>
                        <input className="input" value={it.title} onChange={(e) => setCreativeItems((prev) => prev.map((p, i) => (i === idx ? { ...p, title: e.target.value } : p)))} placeholder="Title — e.g. Summer banner" style={{ fontSize: 12 }} />
                        <input className="input" value={it.image_url} onChange={(e) => setCreativeItems((prev) => prev.map((p, i) => (i === idx ? { ...p, image_url: e.target.value } : p)))} placeholder="Image URL — https://.../banner.jpg" style={{ fontSize: 12 }} />
                        {it.image_url && <img src={it.image_url} alt="" style={{ maxWidth: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />}
                        <input className="input" value={it.link_url} onChange={(e) => setCreativeItems((prev) => prev.map((p, i) => (i === idx ? { ...p, link_url: e.target.value } : p)))} placeholder="Link URL — e.g. https://.../promo" style={{ fontSize: 12 }} />
                        <input className="input" value={it.placement} onChange={(e) => setCreativeItems((prev) => prev.map((p, i) => (i === idx ? { ...p, placement: e.target.value } : p)))} placeholder="Placement — e.g. homepage, hero, sidebar" style={{ fontSize: 12 }} />
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={() => setCreativeItems((prev) => [...prev, { title: "", image_url: "", link_url: "", placement: "homepage" }])}>+ Add creative</button>
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

              {!isStructuredFaq && !isTestimonials && !isBody && !isPosts && !isCreatives && (
                <textarea className="textarea" rows={14} value={contentText} onChange={(e) => setContentText(e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: 12 }} placeholder='{"items": []}' />
              )}

              <div className="stack-h" style={{ gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save & Publish"}
                </button>
                <span className="text-muted" style={{ fontSize: 10 }}>{isStructuredFaq || isTestimonials || isBody || isPosts || isCreatives ? "Structured — no JSON needed. Changes go live immediately." : "Content must be valid JSON. Changes go live immediately."}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
