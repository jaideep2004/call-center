"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import gsap from "gsap";
import styles from "./single.module.css";
import { extractToc } from "@/lib/markdown";
import { renderMarkdown } from "@/lib/markdown";
import { showToast } from "@/lib/use-toast";

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
  published_at: string | null;
  created_at: string;
  body_markdown: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SinglePostInner() {
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeToc, setActiveToc] = useState("");
  const [progress, setProgress] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/cms/blog/${slug}`).then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setPost(body.data?.post ?? null);
        setRelated(body.data?.related ?? []);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }).catch(() => {
      setNotFound(true);
      setLoading(false);
    });
  }, [slug]);

  const toc = useMemo(() => extractToc(post?.body_markdown ?? ""), [post]);
  const bodyHtml = useMemo(() => renderMarkdown(post?.body_markdown ?? ""), [post]);

  useEffect(() => {
    if (!post || loading) return;
    const ctx = gsap.context(() => {
      const items = headerRef.current?.children;
      if (items?.length) gsap.from(items, { opacity: 0, y: 30, duration: 0.8, stagger: 0.1, ease: "power3.out" });
    });
    return () => ctx.revert();
  }, [loading, post]);

  // Reading progress (native scroll — cheap, no ScrollTrigger needed).
  useEffect(() => {
    function onScroll() {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight + 240;
      const done = Math.min(Math.max(120 - rect.top, 0), Math.max(total, 1));
      setProgress(total > 0 ? done / total : 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [post]);

  // Scroll-spy for the TOC.
  useEffect(() => {
    if (!toc.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveToc(e.target.id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    const els: Element[] = [];
    for (const item of toc) {
      const el = document.getElementById(item.id);
      if (el) {
        observer.observe(el);
        els.push(el);
      }
    }
    return () => observer.disconnect();
  }, [toc, bodyHtml]);

  function scrollToSection(e: React.MouseEvent, id: string) {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      showToast("Link copied", "success");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      showToast("Copy failed", "error");
    }
  }

  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <main className={styles.container}>
          <div className="skeleton skeleton-text" style={{ width: "40%" }} />
          <div className="skeleton skeleton-text" style={{ width: "90%", height: 48, marginTop: 16 }} />
          <div className="skeleton" style={{ height: 420, borderRadius: 24, marginTop: 32 }} />
        </main>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className={styles.pageWrapper}>
        <main className={styles.container} style={{ textAlign: "center", paddingTop: 160 }}>
          <h1 className={styles.postTitle}>Article not found</h1>
          <p className={styles.postSubtitle}>It may be a draft or the link is wrong.</p>
          <Link href="/blog" className={styles.backBtn} style={{ justifyContent: "center" }}>← Back to all articles</Link>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.progressBarTrack} aria-hidden>
        <div className={styles.progressBarFill} style={{ transform: `scaleX(${progress})` }} />
      </div>
      <div className={styles.ambientTopGlow} />
      <div className={styles.ambientMidGlow} />

      <main className={styles.container}>
        <div className={styles.breadcrumbRow}>
          <Link href="/blog" className={styles.backBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back to All Articles</span>
          </Link>
          <div className={styles.breadcrumb}>
            <span>Resources</span>
            <span className={styles.sep}>/</span>
            <span>Articles</span>
            <span className={styles.sep}>/</span>
            <span className={styles.currentCrumb}>{post.category}</span>
          </div>
        </div>

        <header className={styles.headerWrapper} ref={headerRef}>
          <div className={styles.pillBadge}>
            <span className={styles.pillDot} />
            <span>{post.category}</span>
          </div>
          <h1 className={styles.postTitle}>{post.title}</h1>
          <p className={styles.postSubtitle}>{post.excerpt}</p>
          <div className={styles.metaBar}>
            <div className={styles.authorGroup}>
              {post.author_avatar ? (
                <img src={post.author_avatar} alt={post.author_name} className={styles.authorAvatar} />
              ) : (
                <span className={styles.authorAvatarFallback} aria-hidden>
                  {post.author_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              )}
              <div>
                <div className={styles.authorName}>{post.author_name}</div>
                <div className={styles.authorDetails}>
                  {post.author_role} • <span>{formatDate(post.published_at ?? post.created_at)}</span> • {post.read_minutes} min read
                </div>
              </div>
            </div>
            <div className={styles.shareGroup}>
              <button className={styles.shareBtn} onClick={copyLink} aria-label="Copy article link">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span>{copied ? "Copied Link!" : "Copy Link"}</span>
              </button>
            </div>
          </div>
        </header>

        {post.cover_image && (
          <div className={styles.heroImageWrapper}>
            <img src={post.cover_image} alt="" className={styles.heroImage} />
            <div className={styles.heroImageBorder} />
          </div>
        )}

        <div className={styles.articleLayout}>
          <aside className={styles.sidebar}>
            <div className={styles.stickyToc}>
              {toc.length > 0 && (
                <>
                  <h4 className={styles.tocHeading}>Table of Contents</h4>
                  <nav className={styles.tocNav}>
                    {toc.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        onClick={(e) => scrollToSection(e, item.id)}
                        className={`${styles.tocLink} ${activeToc === item.id ? styles.activeTocLink : ""}`}
                        style={item.depth > 1 ? { paddingLeft: 22 } : undefined}
                      >
                        {item.label}
                      </a>
                    ))}
                  </nav>
                </>
              )}
              <div className={styles.sidebarCard}>
                <div className={styles.sidebarCardGlow} />
                <span className={styles.sidebarPill}>LIVE DEMO</span>
                <h5>Experience inbound without VoIP desk-phones</h5>
                <p>Browser WebRTC calling with zero configuration.</p>
                <Link href="/register" className={styles.sidebarActionBtn}>Start free →</Link>
              </div>
            </div>
          </aside>

          <article className={styles.contentBody} ref={articleRef} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </div>

        {post.tags.length > 0 && (
          <div className={styles.tagsRow}>
            {post.tags.map((tag) => (
              <span key={tag} className={styles.tagItem}>#{tag}</span>
            ))}
          </div>
        )}

        <div className={styles.authorBioCard}>
          {post.author_avatar ? (
            <img src={post.author_avatar} alt={post.author_name} className={styles.bioAvatar} />
          ) : (
            <span className={styles.bioAvatarFallback} aria-hidden>
              {post.author_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className={styles.bioContent}>
            <span className={styles.bioLabel}>WRITTEN BY</span>
            <h4 className={styles.bioName}>{post.author_name}</h4>
            <p className={styles.bioRole}>{post.author_role} • Coverage Calls</p>
          </div>
        </div>

        {related.length > 0 && (
          <section className={styles.relatedSection}>
            <div className={styles.relatedHeader}>
              <span className={styles.pillBadge}>KEEP READING</span>
              <h3 className={styles.relatedTitle}>Related Articles &amp; Guides</h3>
            </div>
            <div className={styles.relatedGrid}>
              {related.map((rel) => (
                <Link key={rel.id} href={`/blog/${rel.slug}`} className={styles.relatedCard}>
                  <div className={styles.relatedImgWrapper}>
                    {rel.cover_image && <img src={rel.cover_image} alt="" className={styles.relatedImg} loading="lazy" />}
                  </div>
                  <div className={styles.relatedContent}>
                    <div className={styles.relatedMeta}>
                      <span className={styles.relatedCat}>{rel.category}</span>
                      <span>•</span>
                      <span>{rel.read_minutes} min read</span>
                    </div>
                    <h4 className={styles.relatedCardTitle}>{rel.title}</h4>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function SingleBlogPostPage() {
  return <SinglePostInner />;
}
