"use client";

import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer public-footer" style={{ background: "#0a0614", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "56px 0 24px" }}>
      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.8fr 0.8fr 0.8fr 1.2fr", gap: 32, alignItems: "start" }} className="footer-grid">
          <div>
            <Link href="/" aria-label="Coverage Calls home" style={{ display: "inline-flex", marginBottom: 12 }}>
              <img src="/images/coveragecallsfinal.png" alt="Coverage Calls" style={{ height: 28, width: "auto", objectFit: "contain" }} />
            </Link>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.6, margin: "12px 0 16px", maxWidth: 260 }}>
              The inbound call platform for agents and agencies who want better conversations and better results.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X" style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.7)" }}>
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.7)" }}>
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26z"/></svg>
              </a>
            </div>
          </div>
          <div>
            <h4 style={{ color: "white", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 14px" }}>Product</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              <li><Link href="/#features" style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}>Features</Link></li>
              <li><Link href="/#pricing" style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}>Pricing</Link></li>
              <li><Link href="/#how-it-works" style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}>How it Works</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: "white", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 14px" }}>Solutions</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              <li><Link href="/#agent-calls" style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}>For Agents</Link></li>
              <li><Link href="/#dashboard-preview" style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}>For Agencies</Link></li>
              <li><Link href="/#testimonials" style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}>Testimonials</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: "white", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 14px" }}>Resources</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              <li><Link href="/faq" style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}>FAQ</Link></li>
              <li><Link href="/privacy" style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}>Privacy</Link></li>
              <li><Link href="/terms" style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}>Terms</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: "white", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 14px" }}>Company</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              <li><Link href="/about" style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}>About Us</Link></li>
              <li><Link href="/contact" style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}>Contact</Link></li>
              <li><Link href="/privacy" style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}>Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: "white", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 14px" }}>Stay updated</h4>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, lineHeight: 1.6, margin: "0 0 12px" }}>Get product updates and tips to grow your business.</p>
            <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", gap: 8 }}>
              <input type="email" placeholder="Enter your email" required style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 12px", color: "white", fontSize: 12, outline: "none" }} />
              <button type="submit" aria-label="Subscribe" style={{ background: "#7C3AED", border: "none", borderRadius: 8, padding: "10px 12px", color: "white", cursor: "pointer", display: "grid", placeItems: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
            </form>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 40, paddingTop: 20, textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, margin: 0 }}>© 2025 Coverage Calls. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
