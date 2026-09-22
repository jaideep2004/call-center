"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import gsap from "gsap";
import styles from "./blog.module.css";
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
  featured: boolean;
  published_at: string | null;
  created_at: string;
}

interface BlogFeed {
  posts: BlogPost[];
  featured: BlogPost | null;
  categories: string[];
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Avatar({ name, src, size }: { name: string; src: string | null; size: number }) {
  if (src) {
    return <img src={src} alt={name} width={size} height={size} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  }
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <span aria-hidden style={{ width: size, height: size, borderRadius: "50%", display: "inline-grid", placeItems: "center", background: "rgba(168,85,247,.25)", color: "#fff", fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </span>
  );
}

function BlogsPageInner() {
  const [feed, setFeed] = useState<BlogFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All Articles");
  const [searchQuery, setSearchQuery] = useState("");
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/v1/cms/blog").then(async (res) => {
      if (res.ok) {
        const body = await res.json();
        setFeed(body.data ?? { posts: [], featured: null, categories: [] });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => ["All Articles", ...(feed?.categories ?? []).filter((c) => c !== "All Articles")],
    [feed],
  );

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (feed?.posts ?? []).filter((a) => {
      const matchesCategory = activeCategory === "All Articles" || a.category === activeCategory;
      const matchesSearch =
        q === "" ||
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [feed, activeCategory, searchQuery]);

  const showFeatured = searchQuery.trim() === "" && activeCategory === "All Articles" && feed?.featured;

  useEffect(() => {
    if (!feed || loading) return;
    const ctx = gsap.context(() => {
      gsap.from(`.${styles.heroHeader} > *`, { opacity: 0, y: 25, duration: 0.8, stagger: 0.1, ease: "power3.out" });
      const card = pageRef.current?.querySelector(`.${styles.featuredCard}`);
      if (card) gsap.from(card, { opacity: 0, y: 40, scale: 0.98, duration: 0.9, delay: 0.2, ease: "power3.out" });
    }, pageRef);
    return () => ctx.revert();
  }, [loading, feed]);

  useEffect(() => {
    if (gridRef.current?.children.length) {
      gsap.fromTo(
        gridRef.current.children,
        { opacity: 0, y: 20, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.06, ease: "power2.out", overwrite: true },
      );
    }
  }, [activeCategory, searchQuery, filteredArticles.length]);

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || subscribing) return;
    setSubscribing(true);
    try {
      const res = await fetch("/api/v1/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Newsletter subscriber",
          email: email.trim(),
          inquiryType: "newsletter",
          message: "Please add me to The Inbound Dispatch weekly newsletter.",
        }),
      });
      if (res.ok) {
        setEmail("");
        showToast("Subscribed — see you Tuesday", "success");
      } else {
        const body = await res.json().catch(() => ({}));
        showToast(body.message ?? "Subscribe failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
    setSubscribing(false);
  }

  return (
    <div className={styles.pageContainer} ref={pageRef}>
      <div className={styles.ambientTopGlow} />
      <div className={styles.ambientRightGlow} />

      <main className={styles.mainContent}>
        <section className={styles.heroHeader}>
          <div className={styles.pillBadge}>
            <span className={styles.pillDot} />
            <span>COVERAGE CALLS BLOG &amp; RESOURCES</span>
          </div>
          <h1 className={styles.mainTitle}>
            Inbound strategies, playbooks <br />
            <span className={styles.gradientText}>&amp; high-conversion tactics.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Proven playbooks, telemetry teardowns, and tactical guides to help agents,
            brokers, and agencies scale inbound revenue.
          </p>
          <div className={styles.searchWrapper}>
            <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search guides, scripts, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Search articles"
            />
          </div>
        </section>

        {loading ? (
          <div className={styles.articlesSection}>
            <div className={styles.articlesGrid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.card} style={{ minHeight: 320 }}>
                  <div className="skeleton" style={{ height: 200 }} />
                  <div style={{ padding: 24 }}>
                    <div className="skeleton skeleton-text" />
                    <div className="skeleton skeleton-text" style={{ width: "70%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {showFeatured && (
              <section className={styles.featuredSection}>
                <Link href={`/blog/${showFeatured.slug}`} className={styles.featuredCard} style={{ textDecoration: "none" }}>
                  <div className={styles.featuredGlow} />
                  <div className={styles.featuredImageWrapper}>
                    {showFeatured.cover_image && (
                      <img src={showFeatured.cover_image} alt="" className={styles.featuredImage} />
                    )}
                    <div className={styles.imageOverlay} />
                    <span className={styles.featuredFloatingBadge}>Featured</span>
                  </div>
                  <div className={styles.featuredBody}>
                    <div className={styles.metaRow}>
                      <span className={styles.categoryBadge}>{showFeatured.category}</span>
                      <span className={styles.metaDot}>•</span>
                      <span className={styles.metaText}>{showFeatured.read_minutes} min read</span>
                      <span className={styles.metaDot}>•</span>
                      <span className={styles.metaText}>{formatDate(showFeatured.published_at ?? showFeatured.created_at)}</span>
                    </div>
                    <h2 className={styles.featuredTitle}>{showFeatured.title}</h2>
                    <p className={styles.featuredExcerpt}>{showFeatured.excerpt}</p>
                    <div className={styles.featuredFooter}>
                      <div className={styles.authorRow}>
                        <Avatar name={showFeatured.author_name} src={showFeatured.author_avatar} size={42} />
                        <div>
                          <div className={styles.authorName}>{showFeatured.author_name}</div>
                          <div className={styles.authorRole}>{showFeatured.author_role}</div>
                        </div>
                      </div>
                      <span className={styles.readArticleBtn}>
                        <span>Read Article</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            <section className={styles.filterSection}>
              <div className={styles.tabsContainer}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`${styles.tabBtn} ${activeCategory === cat ? styles.activeTab : ""}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.articlesSection}>
              {filteredArticles.length === 0 ? (
                <div className={styles.noResults}>
                  <h3>No articles found</h3>
                  <p>Try searching with another keyword or resetting the category filter.</p>
                  <button
                    onClick={() => { setActiveCategory("All Articles"); setSearchQuery(""); }}
                    className={styles.resetBtn}
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className={styles.articlesGrid} ref={gridRef}>
                  {filteredArticles.map((article) => (
                    <Link key={article.id} href={`/blog/${article.slug}`} className={styles.card} style={{ textDecoration: "none" }}>
                      <div className={styles.cardCoverWrapper}>
                        {article.cover_image && (
                          <img src={article.cover_image} alt="" className={styles.cardCover} loading="lazy" />
                        )}
                        <span className={styles.cardFloatingTag}>{article.tags[0] ?? article.category}</span>
                      </div>
                      <div className={styles.cardContent}>
                        <div className={styles.cardMeta}>
                          <span className={styles.cardCategory}>{article.category}</span>
                          <span className={styles.metaDot}>•</span>
                          <span className={styles.metaText}>{article.read_minutes} min read</span>
                        </div>
                        <h3 className={styles.cardTitle}>{article.title}</h3>
                        <p className={styles.cardExcerpt}>{article.excerpt}</p>
                        <div className={styles.cardFooter}>
                          <div className={styles.cardAuthor}>
                            <Avatar name={article.author_name} src={article.author_avatar} size={26} />
                            <span className={styles.smallAuthorName}>{article.author_name}</span>
                          </div>
                          <span className={styles.cardDate}>{formatDate(article.published_at ?? article.created_at)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <section className={styles.subscribeBanner}>
          <div className={styles.subLeft}>
            <span className={styles.subPill}>THE INBOUND DISPATCH</span>
            <h3 className={styles.subTitle}>Get tactical call scripts &amp; agency benchmarks every Tuesday.</h3>
            <p className={styles.subDesc}>Join 8,400+ agents and founders. No fluff, no spam, unsubscribe at any time.</p>
          </div>
          <form className={styles.subForm} onSubmit={subscribe}>
            <input
              type="email"
              placeholder="Enter your work email"
              className={styles.subInput}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email for newsletter"
            />
            <button type="submit" className={styles.subSubmitBtn} disabled={subscribing}>
              {subscribing ? "…" : "Subscribe"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default function BlogArchivePage() {
  return <BlogsPageInner />;
}
