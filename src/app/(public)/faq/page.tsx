import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ — Coverage Calls",
};

export default function FaqPage() {
  return (
    <section className="page-section">
      <div className="content-page" style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div className="section-label" style={{ marginBottom: 16 }}>FAQ / 01</div>
        <h1 style={{ font: "500 42px var(--serif)", letterSpacing: "-0.04em", margin: "0 0 16px" }}>FAQ</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
          Content coming soon. This page is reserved — check back shortly or explore the homepage.
        </p>
        <Link href="/#how-it-works" className="btn btn-primary" style={{ textDecoration: "none" }}>
          Back to homepage →
        </Link>
      </div>
    </section>
  );
}
