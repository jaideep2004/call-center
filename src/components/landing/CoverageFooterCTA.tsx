"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import styles from "./CoverageFooterCTA.module.css";

export default function CoverageFooterCTA() {
  const containerRef = useRef(null);
  const ctaRef = useRef(null);
  const soundWaveRef = useRef(null);
  const footerLinksRef = useRef(null);

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
            <button className={styles.btnPrimary}>
              <span>Start 7-day free trial</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>

            <button className={styles.btnSecondary}>
              <span>Watch demo</span>
              <div className={styles.playIconWrapper}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 3 20 12 6 21 6 3"></polygon>
                </svg>
              </div>
            </button>
          </div>
        </div>

        {/* ================= BOTTOM FOOTER SECTION ================= */}
        <div className={styles.footerContent} ref={footerLinksRef}>
          {/* Col 1: Brand Info & Socials */}
          <div className={styles.brandCol}>
            <div className={styles.logoRow}>
              <img
                src="/images/coveragec1.png"
                alt="Coverage Calls"
                className={styles.logoImage}
              />
            </div>
            <p className={styles.brandDesc}>
              The inbound call platform for agents and agencies who want better
              conversations and better results.
            </p>
            <div className={styles.socialRow}>
              {/* Twitter / X */}
              <a href="#x" aria-label="Twitter" className={styles.socialBtn}>
                <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              {/* LinkedIn */}
              <a href="#linkedin" aria-label="LinkedIn" className={styles.socialBtn}>
                <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26z"/>
                </svg>
              </a>
              {/* Instagram */}
              <a href="#instagram" aria-label="Instagram" className={styles.socialBtn}>
                <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                </svg>
              </a>
              {/* YouTube */}
              <a href="#youtube" aria-label="YouTube" className={styles.socialBtn}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: Product */}
          <div className={styles.navCol}>
            <h4 className={styles.colHeader}>Product</h4>
            <ul className={styles.linkList}>
              <li><a href="#features">Features</a></li>
              <li><a href="#integrations">Integrations</a></li>
              <li><a href="#security">Security</a></li>
              <li><a href="#roadmap">Roadmap</a></li>
            </ul>
          </div>

          {/* Col 3: Solutions */}
          <div className={styles.navCol}>
            <h4 className={styles.colHeader}>Solutions</h4>
            <ul className={styles.linkList}>
              <li><a href="#agents">Agents</a></li>
              <li><a href="#agencies">Agencies</a></li>
              <li><a href="#insurance">Insurance</a></li>
              <li><a href="#call-centers">Call Centers</a></li>
            </ul>
          </div>

          {/* Col 4: Resources */}
          <div className={styles.navCol}>
            <h4 className={styles.colHeader}>Resources</h4>
            <ul className={styles.linkList}>
              <li><a href="#blog">Blog</a></li>
              <li><a href="#help">Help Center</a></li>
              <li><a href="#guides">Guides</a></li>
              <li><a href="#api">API Docs</a></li>
            </ul>
          </div>

          {/* Col 5: Company */}
          <div className={styles.navCol}>
            <h4 className={styles.colHeader}>Company</h4>
            <ul className={styles.linkList}>
              <li><a href="#about">About Us</a></li>
              <li><a href="#careers">Careers</a></li>
              <li><a href="#contact">Contact</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Col 6: Stay Updated Form */}
          <div className={styles.newsletterCol}>
            <h4 className={styles.colHeader}>Stay updated</h4>
            <p className={styles.newsletterDesc}>
              Get product updates and tips to grow your business.
            </p>
            <form className={styles.formRow} onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Enter your email"
                className={styles.emailInput}
                required
              />
              <button type="submit" className={styles.submitBtn} aria-label="Subscribe">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </form>
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
