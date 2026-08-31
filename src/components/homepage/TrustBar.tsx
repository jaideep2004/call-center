"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useIsomorphicLayoutEffect, prefersReducedMotion } from "@/lib/animations";

const logos = [
  { name: "Pinnacle", icon: "home" },
  { name: "HealthFirst", icon: "heart" },
  { name: "TrustCare", icon: "check" },
  { name: "SecureLife", icon: "sun" },
  { name: "Apex Benefits", icon: "apex" },
  { name: "Unity Health", icon: "unity" },
];

function LogoIcon({ icon }: { icon: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" } as const;
  const stroke = { stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (icon) {
    case "home":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 11.5 12 5l8 6.5" {...stroke} />
          <path d="M6.5 10.5V19h11v-8.5" {...stroke} />
        </svg>
      );
    case "heart":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 20s-7-4.6-9-9c-1.3-3 1-6.5 4.2-6.5 2.2 0 3.8 1.4 4.8 2.9 1-1.5 2.6-2.9 4.8-2.9 3.2 0 5.5 3.5 4.2 6.5-2 4.4-9 9-9 9Z" {...stroke} />
        </svg>
      );
    case "check":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" {...stroke} />
          <path d="m8 12.5 2.6 2.6L16 9.5" {...stroke} />
        </svg>
      );
    case "sun":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="4" {...stroke} />
          <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19" {...stroke} />
        </svg>
      );
    case "apex":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 3.5 21 19H3L12 3.5Z" {...stroke} />
          <path d="M12 10.5l3.4 5.8H8.6L12 10.5Z" {...stroke} />
        </svg>
      );
    case "unity":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="9" {...stroke} />
          <path d="M8.5 9.5h7M8.5 12h5M8.5 14.5h7" {...stroke} />
        </svg>
      );
    default:
      return null;
  }
}

export function TrustBar() {
  const root = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const reduced = prefersReducedMotion();
      if (reduced) return;

      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 85%", once: true },
        defaults: { ease: "power2.out" },
      });
      tl.from(".trust-label", { y: 12, opacity: 0, duration: 0.6 })
        .from(".trust-logo", { y: 12, opacity: 0, stagger: 0.06, duration: 0.6 }, "-=0.35")
        // Optional signature effect: one ultra-soft light sweep across the row
        .fromTo(
          ".trust-sweep",
          { xPercent: -30, opacity: 0 },
          { xPercent: 130, opacity: 1, duration: 1.8, ease: "sine.inOut" },
          "+=0.2"
        )
        .to(".trust-sweep", { opacity: 0, duration: 0.4 }, "<");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="trust" ref={root}>
      <p className="trust-label">TRUSTED BY GROWING TEAMS</p>
      <div className="trust-row">
        <div className="trust-sweep" aria-hidden="true" />
        {logos.map((logo) => (
          <span key={logo.name} className="trust-logo">
            <LogoIcon icon={logo.icon} />
            {logo.name}
          </span>
        ))}
      </div>
    </section>
  );
}
