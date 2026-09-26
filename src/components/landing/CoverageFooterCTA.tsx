"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import styles from "./CoverageFooterCTA.module.css";

export default function CoverageFooterCTA() {
  const containerRef = useRef(null);
  const ctaRef = useRef(null);
  const soundWaveRef = useRef(null);
  const footerLinksRef = useRef(null);
  // Newsletter posts into the contact inbox (inquiry_type=newsletter).
  const [newsEmail, setNewsEmail] = useState("");
  const [newsState, setNewsState] = useState<"idle" | "sending" | "done" | "error">("idle");

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Entrance animation for the CTA card
      gsap.from(ctaRef.current, {
        opacity: 0,
        y: 40,
        scale: 0.98,
        duration: 1,
        ease: "power3.out",
        clearProps: "opacity,transform",
      });

      // 2. Soundwave subtle breathing/pulsing animation
      if (soundWaveRef.current) {
        const bars = (soundWaveRef.current as HTMLElement).querySelectorAll("path, rect");
        if (bars.length) {
          gsap.to(bars, {
            scaleY: () => gsap.utils.random(0.6, 1.4),
            transformOrigin: "bottom center",
            duration: 1.2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            stagger: {
              each: 0.05,
              from: "random",
            },
          });
        }
      }

      // 3. Footer columns stagger entrance
      if (footerLinksRef.current) {
        gsap.from((footerLinksRef.current as HTMLElement).children, {
          opacity: 0,
          y: 20,
          duration: 0.8,
          stagger: 0.08,
          ease: "power2.out",
          delay: 0.3,
          clearProps: "opacity,transform",
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer className={styles.wrapper} ref={containerRef}>
      <div className={styles.container}>
        {/* ================= TOP CTA BANNER ================= */}
        <div className={styles.ctaCard} ref={ctaRef}>
          {/* Background Audio Waveform / Line Graphic */}
          <div className={styles.waveGraphic} ref={soundWaveRef}>
            <svg
              viewBox="0 0 600 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={styles.soundWaveSvg}
            >
              {/* Subtle line background chart */}
              <path
                d="M0 70 Q 50 60, 100 68 T 200 45 T 300 65 T 400 35 T 500 55 T 600 40"
                stroke="rgba(192, 132, 252, 0.15)"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M0 80 Q 70 75, 140 82 T 280 60 T 420 75 T 560 50 T 600 55"
                stroke="rgba(147, 51, 234, 0.12)"
                strokeWidth="1"
                fill="none"
              />

              {/* Sound Bars (Right-side equalizer) */}
              <rect x="420" y="55" width="2.5" height="20" rx="1" fill="#7034c4" opacity="0.4" />
              <rect x="427" y="50" width="2.5" height="30" rx="1" fill="#7d3ecc" opacity="0.5" />
              <rect x="434" y="42" width="2.5" height="46" rx="1" fill="#8b48d6" opacity="0.6" />
              <rect x="441" y="30" width="2.5" height="70" rx="1" fill="#9952e0" opacity="0.7" />
              <rect x="448" y="20" width="2.5" height="90" rx="1" fill="#aa5ff0" opacity="0.8" />
              <rect x="455" y="38" width="2.5" height="54" rx="1" fill="#9d55e3" opacity="0.75" />
              <rect x="462" y="15" width="2.5" height="100" rx="1" fill="#ba6eff" opacity="0.9" />
              <rect x="469" y="32" width="2.5" height="66" rx="1" fill="#aa5ff0" opacity="0.8" />
              <rect x="476" y="48" width="2.5" height="34" rx="1" fill="#924cd8" opacity="0.65" />
              <rect x="483" y="58" width="2.5" height="14" rx="1" fill="#7936cb" opacity="0.45" />
              <rect x="490" y="52" width="2.5" height="26" rx="1" fill="#843ed4" opacity="0.5" />
              <rect x="497" y="45" width="2.5" height="40" rx="1" fill="#924cd8" opacity="0.6" />
              <rect x="504" y="25" width="2.5" height="80" rx="1" fill="#b064f7" opacity="0.85" />
              <rect x="511" y="40" width="2.5" height="50" rx="1" fill="#9d55e3" opacity="0.7" />
              <rect x="518" y="54" width="2.5" height="22" rx="1" fill="#7e3bcc" opacity="0.5" />
              <rect x="525" y="60" width="2.5" height="10" rx="1" fill="#6929bc" opacity="0.3" />
            </svg>
          </div>

          {/* Left Content */}
          <div className={styles.ctaLeft}>
            <h2 className={styles.ctaTitle}>
              Ready to start <br />
              taking better calls?
            </h2>
            <p className={styles.ctaSubtitle}>
              Join hundreds of agents and agencies growing <br />
              their business with Coverage Calls.
            </p>
          </div>

          {/* Right Action Buttons */}
          <div className={styles.ctaRight}>
            <a href="/register" className={styles.btnPrimary} style={{textDecoration:'none'}}>
              <span>Start 7-day free trial</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </a>
            <a href="/#how-it-works" className={styles.btnSecondary} style={{textDecoration:'none'}}>
              <span>Watch demo</span>
              <div className={styles.playIconWrapper}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
              </div>
            </a>
          </div>
        </div>

        {/* ================= BOTTOM FOOTER SECTION ================= */}
        <div className={styles.footerContent} ref={footerLinksRef}>
          {/* Col 1: Brand Info & Socials */}
          <div className={styles.brandCol}>
            <div className={styles.logoRow}>
              <img
                src="/images/coveragecallsfinal.png"
                alt="Coverage Calls"
                className={styles.logoImage}
                style={{ height: 28, width: "auto", objectFit: "contain" }}
              />
            </div>
            <p className={styles.brandDesc}>
              The inbound call platform for agents and agencies who want better
              conversations and better results.
            </p>
            <div className={styles.socialRow}>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className={styles.socialBtn}>
                <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={styles.socialBtn}>
              <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26z"/></svg>
            </a>
            </div>
          </div>

          {/* Col 2: Product */}
          <div className={styles.navCol}>
            <h4 className={styles.colHeader}>Product</h4>
            <ul className={styles.linkList}>
              <li><a href="/#features">Features</a></li>
              <li><a href="/#pricing">Pricing</a></li>
              <li><a href="/#how-it-works">How it Works</a></li>
            </ul>
          </div>

          {/* Col 3: Solutions */}
          <div className={styles.navCol}>
            <h4 className={styles.colHeader}>Solutions</h4>
            <ul className={styles.linkList}>
              <li><a href="/#agent-calls">For Agents</a></li>
              <li><a href="/#dashboard-preview">For Agencies</a></li>
              <li><a href="/#testimonials">Testimonials</a></li>
            </ul>
          </div>

          {/* Col 4: Resources */}
          <div className={styles.navCol}>
            <h4 className={styles.colHeader}>Resources</h4>
            <ul className={styles.linkList}>
              <li><a href="/faq">FAQ</a></li>
              <li><a href="/privacy">Privacy</a></li>
              <li><a href="/terms">Terms</a></li>
            </ul>
          </div>

          {/* Col 5: Company */}
          <div className={styles.navCol}>
            <h4 className={styles.colHeader}>Company</h4>
            <ul className={styles.linkList}>
              <li><a href="/about">About Us</a></li>
              <li><a href="/contact">Contact</a></li>
              <li><a href="/privacy">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Col 6: Stay Updated Form */}
          <div className={styles.newsletterCol}>
            <h4 className={styles.colHeader}>Stay updated</h4>
            <p className={styles.newsletterDesc}>
              Get product updates and tips to grow your business.
            </p>
            <form className={styles.formRow} onSubmit={async (e) => {
              e.preventDefault();
              if (!newsEmail.trim() || newsState === "sending" || newsState === "done") return;
              setNewsState("sending");
              try {
                const res = await fetch("/api/v1/public/contact", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: "Newsletter subscriber", email: newsEmail.trim(), inquiryType: "newsletter", message: "Newsletter signup from homepage footer." }),
                });
                setNewsState(res.ok ? "done" : "error");
              } catch {
                setNewsState("error");
              }
            }}>
              <input
                type="email"
                placeholder={newsState === "done" ? "Subscribed ✓" : "Enter your email"}
                className={styles.emailInput}
                required
                disabled={newsState === "done" || newsState === "sending"}
                value={newsEmail}
                onChange={(e) => setNewsEmail(e.target.value)}
              />
              <button type="submit" className={styles.submitBtn} aria-label="Subscribe" disabled={newsState === "sending" || newsState === "done"}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </form>
            {newsState === "error" && <p style={{ fontSize: 11, color: "#f87171", marginTop: 6 }}>Could not subscribe — try again.</p>}
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className={styles.bottomBar}>
          <p>© 2025 Coverage Calls. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
