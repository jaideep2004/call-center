"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, ScrollTrigger, useIsomorphicLayoutEffect, prefersReducedMotion, isSmallViewport } from "@/lib/animations";

export function FinalCTA() {
  const root = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const reduced = prefersReducedMotion();
      const small = isSmallViewport();
      if (reduced) return;

      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 78%", once: true },
        defaults: { ease: "power2.out" },
      });
      tl.from(".cta-title", { y: 25, opacity: 0, duration: 0.8 })
        .from(".cta-sub", { y: 15, opacity: 0, duration: 0.6 }, "-=0.35")
        .from(".cta-actions > *", { y: 14, opacity: 0, stagger: 0.1, duration: 0.55 }, "-=0.3")
        .fromTo(
          ".cta-primary-btn",
          { boxShadow: "0 0 0 rgba(255,255,255,0)" },
          { boxShadow: "0 0 32px rgba(196,132,252,0.55)", duration: 0.6, yoyo: true, repeat: 1 },
          "<"
        );

      // 16.2 background waveform drifts slowly, extremely low opacity
      if (!small) {
        tl.to(
          ".cta-wave path",
          { strokeDashoffset: -240, duration: 10, ease: "none", repeat: -1 },
          "<"
        );
      }
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="cta" ref={root}>
      <div className="cta-banner">
        <svg className="cta-wave" viewBox="0 0 600 160" fill="none" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M0 80 Q 50 30 100 80 T 200 80 T 300 80 T 400 80 T 500 80 T 600 80"
            stroke="rgba(246,231,255,0.35)"
            strokeWidth="1.5"
            strokeDasharray="10 14"
          />
          <path
            d="M0 110 Q 50 150 100 110 T 200 110 T 300 110 T 400 110 T 500 110 T 600 110"
            stroke="rgba(246,231,255,0.18)"
            strokeWidth="1.5"
            strokeDasharray="4 10"
          />
        </svg>
        <div className="cta-inner">
          <div className="cta-copy">
            <h2 className="cta-title">
              Ready to start
              <br />
              taking better calls?
            </h2>
            <p className="cta-sub">
              Join hundreds of agents and agencies growing their business with Coverage Calls.
            </p>
          </div>
          <div className="cta-actions">
            <Link className="cc-btn cc-btn-light cc-btn-lg cta-primary-btn" href="/register">
              Start 7-day free trial <span aria-hidden="true">→</span>
            </Link>
            <Link className="cc-btn cc-btn-outline-light cc-btn-lg" href="/register">
              Watch demo
              <span className="play-badge" aria-hidden="true">▶</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
