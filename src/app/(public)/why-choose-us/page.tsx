import type { Metadata } from "next";
import Link from "next/link";
import { cmsSections } from "@/server/repositories/cms-sections";

export const metadata: Metadata = {
  title: "Why Choose Us — Coverage Calls",
};

export const revalidate = 60;

export default async function WhyChooseUsPage() {
  const section = await cmsSections.findBySlug("posts").catch(() => null);
  const fallback = await cmsSections.findBySlug("blog").catch(() => null);
  const src = section ?? fallback;
  const items = (src?.content as { items?: { title: string; excerpt: string; body: string; image: string; author: string; slug: string }[] })?.items ?? [];
  const isLive = src?.active && items.length > 0;

  return (
    <section className="page-section">
      <div className="content-page" style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px" }}>
        <div className="section-label" style={{ marginBottom: 16, textAlign: "center" }}>WHY CHOOSE US / 01</div>
        <h1 style={{ font: "500 42px var(--serif)", letterSpacing: "-0.04em", margin: "0 0 16px", textAlign: "center" }}>{src?.title || "Why Choose Us"}</h1>
        {isLive ? (
          <div style={{ display: "grid", gap: 24, marginTop: 32, textAlign: "left" }}>
            {items.map((post, i) => (
              <article key={post.slug || i} className="card" style={{ padding: 20, display: "grid", gap: 12 }}>
                {post.image && <img src={post.image} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }} />}
                <h3 style={{ font: "600 18px var(--serif)", margin: "4px 0 6px" }}>{post.title}</h3>
                {post.excerpt && <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{post.excerpt}</p>}
                {post.body && <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{post.body.slice(0, 400)}</p>}
                {post.author && <p style={{ fontSize: 11, color: "var(--muted)", margin: "8px 0 0", fontFamily: "var(--mono)" }}>— {post.author}</p>}
              </article>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
              Content coming soon. This page is reserved — check back shortly or explore the homepage.
            </p>
            <Link href="/#how-it-works" className="btn btn-primary" style={{ textDecoration: "none" }}>
              Back to homepage →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
