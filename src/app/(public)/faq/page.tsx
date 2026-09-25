import type { Metadata } from "next";
import Link from "next/link";
import FAQSection from "@/components/landing/FAQSection";
import { cmsSections } from "@/server/repositories/cms-sections";

export const metadata: Metadata = {
  title: "FAQ — Coverage Calls",
};

export const revalidate = 60;

export default async function FaqPage() {
  const section = await cmsSections.findBySlug("faq").catch(() => null);
  const items = (
    (section?.content as { items?: { question: string; answer: string; category?: string }[] })?.items ?? []
  )
    .filter((it) => it.question?.trim() && it.answer?.trim())
    .map((it) => ({ question: it.question.trim(), answer: it.answer.trim(), category: it.category?.trim() || "General" }));
  const isLive = section?.active && items.length > 0;

  // Same accordion design as the homepage section — one component, two
  // places: homepage shows the first 3, this page shows the full archive.
  if (!isLive) {
    return (
      <section className="page-section">
        <div className="content-page" style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px" }}>
          <div className="section-label" style={{ marginBottom: 16 }}>FAQ / 01</div>
          <h1 style={{ font: "500 42px var(--serif)", letterSpacing: "-0.04em", margin: "0 0 16px" }}>{section?.title || "FAQ"}</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px", textAlign: "center" }}>
            Content coming soon. This page is reserved — check back shortly or explore the homepage.
          </p>
          <div style={{ textAlign: "center" }}>
            <Link href="/#how-it-works" className="btn btn-primary" style={{ textDecoration: "none" }}>
              Back to homepage →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return <FAQSection items={items} />;
}
