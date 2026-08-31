"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useIsomorphicLayoutEffect, prefersReducedMotion } from "@/lib/animations";

const steps = [
  {
    num: "01",
    title: "We run the ads",
    desc: "High-intent campaigns reach people actively looking for coverage.",
    icon: "ads",
  },
  {
    num: "02",
    title: "Prospects call in",
    desc: "Calls are verified and matched to the right campaign and licensed status.",
    icon: "prospect",
  },
  {
    num: "03",
    title: "Calls route to you",
    desc: "Live calls land in your browser instantly—no phone system needed.",
    icon: "phone",
  },
  {
    num: "04",
    title: "You have the conversation",
    desc: "Talk, qualify, and close. Every call is recorded and tracked for quality.",
    icon: "wave",
  },
  {
    num: "05",
    title: "We handle the rest",
    desc: "You only pay for qualified, billable calls. Everything stays transparent.",
    icon: "check",
  },
];

function StepIcon({ icon }: { icon: string }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none" } as const;
  const stroke = { stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (icon) {
    case "ads":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="3" y="4" width="18" height="13" rx="2" {...stroke} />
          <path d="M3 17.5 8 12l3.5 3.2L15 12l6 5.5" {...stroke} />
          <path d="M9 8h.01M12 8h.01" {...stroke} />
          <path d="M8 20.5h8" {...stroke} />
        </svg>
      );
    case "prospect":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="8" r="3.6" {...stroke} />
          <path d="M5.5 20c1-4.4 3.6-6.6 6.5-6.6s5.5 2.2 6.5 6.6" {...stroke} />
        </svg>
      );
    case "phone":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M8.6 4.5c.3-.7.9-1 1.6-.9l2 .3c.7.1 1.2.8 1.1 1.5l-.3 2.1c-.1.6-.6 1-1.2 1.1l-1.2.2c.3 1.6 1.4 2.8 3 3.1l.2-1.2c.1-.6.5-1.1 1.1-1.2l2.1-.3c.7-.1 1.4.4 1.5 1.1l.3 2c.1.7-.2 1.3-.9 1.6-4.7 1.9-9.8-1.2-11.7-5.9-.4-1-.5-2.1-.2-3.1l1.6-1.4Z" {...stroke} />
        </svg>
      );
    case "wave":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" {...stroke} />
        </svg>
      );
    case "check":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" {...stroke} />
          <path d="m8.5 12.3 2.4 2.4 4.6-5" {...stroke} />
        </svg>
      );
    default:
      return null;
  }
}

export function HowItWorks() {
  const root = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const reduced = prefersReducedMotion();
      if (reduced) return;

      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 72%", once: true },
        defaults: { ease: "power2.out" },
      });

      // 11.1 section reveal
      tl.from(".hiw-eyebrow", { y: 14, opacity: 0, duration: 0.5 })
        .from(".hiw-heading", { y: 25, opacity: 0, duration: 0.7 }, "-=0.25");

      // 11.2 connecting line draws
      tl.from(".hiw-line", { scaleX: 0, duration: 1.5, ease: "power2.out" }, "-=0.3");

      // 11.3 node activation (the line "powers" the nodes)
      tl.from(
        ".hiw-node",
        {
          scale: 0.85,
          opacity: 0,
          stagger: 0.22,
          duration: 0.6,
          onComplete: function () {
            // 11.4 step-specific micro motions fire as each node settles
            const nodes = root.current?.querySelectorAll(".hiw-node");
            nodes?.forEach((node, i) => {
              const icon = node.querySelector(".hiw-icon");
              if (!icon) return;
              const idx = i;
              if (idx === 0) {
                gsap.fromTo(icon, { scale: 0.9 }, { scale: 1, duration: 0.4, ease: "back.out(2)" });
              } else if (idx === 1) {
                gsap.fromTo(icon, { opacity: 0.5 }, { opacity: 1, duration: 0.5, yoyo: true, repeat: 1 });
              } else if (idx === 2) {
                gsap.fromTo(
                  icon,
                  { filter: "drop-shadow(0 0 0 rgba(168,85,247,0))" },
                  { filter: "drop-shadow(0 0 10px rgba(168,85,247,0.8))", duration: 0.5, yoyo: true, repeat: 1 }
                );
              } else if (idx === 3) {
                gsap.fromTo(icon, { scaleY: 0.75 }, { scaleY: 1, duration: 0.45, yoyo: true, repeat: 2 });
              } else {
                const path = icon.querySelector("path:last-of-type");
                if (path) {
                  gsap.fromTo(path, { opacity: 0.25 }, { opacity: 1, duration: 0.5 });
                }
              }
            });
          },
        },
        "-=1.1"
      );

      tl.from(".hiw-node .hiw-copy > *", { y: 12, opacity: 0, stagger: 0.08, duration: 0.5 }, "-=2.4");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="hiw" id="how-it-works" ref={root}>
      <div className="hiw-head">
        <p className="section-eyebrow">HOW IT WORKS</p>
        <h2 className="section-heading hiw-heading">From ad click to closed policy</h2>
      </div>

      <div className="hiw-track">
        <div className="hiw-line" aria-hidden="true" />
        <ol className="hiw-steps">
          {steps.map((step) => (
            <li key={step.num} className="hiw-node">
              <div className="hiw-node-top">
                <span className="hiw-icon">
                  <StepIcon icon={step.icon} />
                </span>
                <span className="hiw-num">{step.num}</span>
              </div>
              <div className="hiw-copy">
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
