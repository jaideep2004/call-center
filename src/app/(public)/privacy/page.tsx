import type { Metadata } from "next";
import Link from "next/link";
import { cmsSections } from "@/server/repositories/cms-sections";

export const metadata: Metadata = {
  title: "Privacy Policy — Coverage Calls",
};

export const revalidate = 60;

function mdToHtml(md: string): string {
  let h = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  h = h.replace(/^### (.+)$/gm, "<h3 style='font-size:15px;font-weight:700;margin:14px 0 8px'>$1</h3>");
  h = h.replace(/^## (.+)$/gm, "<h2 style='font-size:18px;font-weight:800;margin:16px 0 10px'>$1</h2>");
  h = h.replace(/^# (.+)$/gm, "<h1 style='font-size:22px;font-weight:800;margin:16px 0 12px'>$1</h1>");
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/\*(.+?)\*/g, "<em>$1</em>");
  h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "<a href='$2' target='_blank' rel='noreferrer' style='color:#7C3AED'>$1</a>");
  h = h.replace(/^(?:- |\* )(.+)$/gm, "<li style='margin-left:18px;list-style:disc'>$1</li>");
  h = h.replace(/(<li[^>]*>.*<\/li>)/gs, "<ul style='margin:8px 0'>$1</ul>");
  h = h.replace(/\n{2,}/g, "</p><p style='margin:8px 0;line-height:1.7'>");
  h = h.replace(/\n/g, "<br/>");
  return `<div style='font-size:14px;line-height:1.7;color:#6B7280'><p style='margin:8px 0;line-height:1.7'>${h}</p></div>`;
}

export default async function PrivacyPage() {
  const section = await cmsSections.findBySlug("privacy").catch(() => null);
  const body = (section?.content as { body?: string })?.body?.trim() ?? "";
  const isLive = section?.active && body.length > 0;

  return (
    <section className="page-section">
      <div className="content-page" style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px" }}>
        <div className="section-label" style={{ marginBottom: 16 }}>PRIVACY / 01</div>
        <h1 style={{ font: "500 42px var(--serif)", letterSpacing: "-0.04em", margin: "0 0 16px" }}>{section?.title || "Privacy Policy"}</h1>
        {isLive ? (
          <div style={{ textAlign: "left", marginTop: 24 }} dangerouslySetInnerHTML={{ __html: mdToHtml(body) }} />
        ) : (
          <>
            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px", textAlign: "center" }}>
              Content coming soon. This page is reserved — check back shortly or explore the homepage.
            </p>
            <div style={{ textAlign: "center" }}>
              <Link href="/#how-it-works" className="btn btn-primary" style={{ textDecoration: "none" }}>
                Back to homepage →
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
