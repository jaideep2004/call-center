"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useIsomorphicLayoutEffect, prefersReducedMotion } from "@/lib/animations";

const features = [
  {
    title: "WebRTC Calling",
    desc: "Crystal clear calls right in your browser. No plugins, no hassle.",
    featured: false,
    icon: "call",
  },
  {
    title: "Real-Time Routing",
    desc: "Smart routing connects callers to the best available agent instantly.",
    featured: true,
    icon: "bolt",
  },
  {
    title: "Call Recording",
    desc: "100% call recording with transcripts for training and compliance.",
    featured: false,
    icon: "mic",
  },
  {
    title: "Agent Management",
    desc: "Add agents, set permissions, and track performance.",
    featured: false,
    icon: "users",
  },
  {
    title: "Campaign Tracking",
    desc: "See which campaigns drive the best calls and conversions.",
    featured: false,
    icon: "chart",
  },
  {
    title: "Secure & Compliant",
    desc: "Enterprise-grade security and compliance you can count on.",
    featured: false,
    icon: "shield",
  },
];

function FeatureIcon({ icon }: { icon: string }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none" } as const;
  const stroke = { stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (icon) {
    case "call":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M8.6 4.5c.3-.7.9-1 1.6-.9l2 .3c.7.1 1.2.8 1.1 1.5l-.3 2.1c-.1.6-.6 1-1.2 1.1l-1.2.2c.3 1.6 1.4 2.8 3 3.1l.2-1.2c.1-.6.5-1.1 1.1-1.2l2.1-.3c.7-.1 1.4.4 1.5 1.1l.3 2c.1.7-.2 1.3-.9 1.6-4.7 1.9-9.8-1.2-11.7-5.9-.4-1-.5-2.1-.2-3.1l1.6-1.4Z" {...stroke} />
          <path d="M9.5 14.5 4 20M14.5 9.5 20 4" {...stroke} />
        </svg>
      );
    case "bolt":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M13 2 5 13.5h6L11 22l8-11.5h-6L13 2Z" {...stroke} />
        </svg>
      );
    case "mic":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="9" y="3" width="6" height="11" rx="3" {...stroke} />
          <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" {...stroke} />
        </svg>
      );
    case "users":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="9" cy="8.5" r="3.2" {...stroke} />
          <path d="M3.5 19c.8-3.4 3-5 5.5-5s4.7 1.6 5.5 5" {...stroke} />
          <path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.8 14.3c1.7.8 2.7 2.3 3 4.7" {...stroke} />
        </svg>
      );
    case "chart":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 4v15.5h16" {...stroke} />
          <path d="m7.5 14 3.5-4 3 2.5 4.5-6" {...stroke} />
        </svg>
      );
    case "shield":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 3 19 6v5.5c0 4.3-3 7.6-7 9.5-4-1.9-7-5.2-7-9.5V6l7-3Z" {...stroke} />
          <path d="m9 12 2.2 2.2L15.5 9.5" {...stroke} />
        </svg>
      );
    default:
      return null;
  }
}

export function Features() {
  const root = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const reduced = prefersReducedMotion();
      if (reduced) return;

      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 75%", once: true },
        defaults: { ease: "power2.out" },
      });
      tl.from(".feat-eyebrow", { y: 14, opacity: 0, duration: 0.5 })
        .from(".feat-heading", { y: 20, opacity: 0, duration: 0.6 }, "-=0.25")
        .from(".feat-card", { y: 20, opacity: 0, stagger: 0.09, duration: 0.55 }, "-=0.3");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="features" id="features" ref={root}>
      <div className="features-head">
        <p className="section-eyebrow feat-eyebrow" style={{ display: "inline-flex", gap: "6px" }}><span style={{ color: "#A855F7" }}>POWERFUL FEATURES.</span><span style={{ color: "#FAFAFC" }}> SIMPLE TO USE.</span></p>
        <h2 className="section-heading feat-heading">
          Powerful features. <em>Simple to use.</em>
        </h2>
      </div>
      <div className="feature-grid">
        {features.map((f) => (
          <article key={f.title} className={`feat-card${f.featured ? " featured" : ""}`}>
            <span className="feat-icon">
              <FeatureIcon icon={f.icon} />
            </span>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
