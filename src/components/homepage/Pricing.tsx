"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, ScrollTrigger, useIsomorphicLayoutEffect, prefersReducedMotion } from "@/lib/animations";

const plans = [
  {
    name: "Agent",
    price: "$97",
    per: "/mo",
    blurb: "For individual agents taking inbound calls.",
    features: ["7-day free trial", "Live inbound calls", "Full call logs & recordings", "Scripts & lead context"],
    cta: "Start free trial",
    featured: false,
  },
  {
    name: "Agency",
    price: "$147",
    per: "/mo",
    blurb: "For teams managing a growing group of agents.",
    features: ["Everything in Agent", "Team analytics & leaderboards", "Whisper coaching", "Priority support"],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "White-Label",
    price: "$499",
    per: "/mo",
    blurb: "For agencies ready to launch their own brand.",
    features: ["Everything in Agency", "Custom branding & domain", "Agent & client portals", "Dedicated onboarding"],
    cta: "Start free trial",
    featured: false,
  },
];

export function Pricing() {
  const root = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const reduced = prefersReducedMotion();
      if (reduced) return;

      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 75%", once: true },
        defaults: { ease: "power2.out" },
      });
      tl.from(".price-eyebrow", { y: 14, opacity: 0, duration: 0.5 })
        .from(".price-heading", { y: 20, opacity: 0, duration: 0.6 }, "-=0.25")
        // Agent, White-Label, then Agency ~100ms later — featured feels intentional
        .from(".plan-card:not(.featured)", { y: 24, opacity: 0, stagger: 0.1, duration: 0.6 }, "-=0.25")
        .from(".plan-card.featured", { y: 24, opacity: 0, duration: 0.65 }, "-=0.35")
        // Agency border brightens slowly over ~700ms (§15.2)
        .fromTo(
          ".plan-card.featured",
          { borderColor: "rgba(168,85,247,0.35)" },
          { borderColor: "rgba(168,85,247,0.85)", duration: 0.7 },
          "<+0.2"
        )
        .from(".plan-footnote", { y: 10, opacity: 0, duration: 0.5 }, "-=0.3");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="pricing" id="pricing" ref={root}>
      <div className="pricing-head">
        <p className="section-eyebrow price-eyebrow">SIMPLE, SCALABLE PRICING</p>
        <h2 className="section-heading price-heading">
          Start small. <em>Scale big.</em>
        </h2>
      </div>

      <div className="plan-grid">
        {plans.map((plan) => (
          <article key={plan.name} className={`plan-card${plan.featured ? " featured" : ""}`}>
            {plan.featured && <span className="plan-badge">MOST POPULAR</span>}
            <h3>{plan.name}</h3>
            <p className="plan-price">
              {plan.price}
              <span>{plan.per}</span>
            </p>
            <p className="plan-blurb">{plan.blurb}</p>
            <ul className="plan-features">
              {plan.features.map((f) => (
                <li key={f}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8.5 6.2 11.7 13 4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              className={`cc-btn ${plan.featured ? "cc-btn-primary" : "cc-btn-outline"} plan-cta`}
              href="/register"
            >
              {plan.cta}
            </Link>
          </article>
        ))}
      </div>

      <p className="plan-footnote">All plans include a 7-day free trial. Cancel anytime.</p>
    </section>
  );
}
