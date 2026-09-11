"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import styles from "./TestimonialsSection.module.css";

const testimonialsRow1 = [
  {
    id: 1,
    name: "Sarah Jenkins",
    role: "Principal Broker",
    agency: "Apex Health Partners",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    metric: "+142% Close Rate",
    quote:
      "Switching our inbound call routing to Coverage Calls doubled our pickup-to-close conversion rate within the first 30 days. The browser interface is instant.",
    tag: "Medicare & ACA",
  },
  {
    id: 2,
    name: "Marcus Vance",
    role: "Founder & CEO",
    agency: "Vance Insurance Group",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    metric: "4.9x Inbound ROI",
    quote:
      "The real-time AI transcription and call intent data are unmatched. We discarded our legacy desk VoIP systems completely and never looked back.",
    tag: "Commercial Lines",
  },
  {
    id: 3,
    name: "Elena Rostova",
    role: "VP of Inbound Sales",
    agency: "Pinnacle Direct",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    metric: "18s Speed-to-Answer",
    quote:
      "Live caller intent preview lets my team open calls knowing the prospect's exact coverage gap. It feels like having an unfair advantage.",
    tag: "Final Expense",
  },
  {
    id: 4,
    name: "David Sterling",
    role: "Agency Director",
    agency: "Sterling & Co. Brokers",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    metric: "95+ Agents Scaled",
    quote:
      "We scaled our remote sales force from 12 to 95 agents without purchasing a single hardware phone. Browser WebRTC is crystal clear.",
    tag: "Life & Annuities",
  },
];

const testimonialsRow2 = [
  {
    id: 5,
    name: "Chloe Bennett",
    role: "Head of Call Operations",
    agency: "HealthFirst Coverage",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    metric: "99.4% Adherence",
    quote:
      "The whisper coaching and AI live notes turned our junior reps into top-tier producers within two weeks. Our compliance issues dropped to zero.",
    tag: "Medicare Advantage",
  },
  {
    id: 6,
    name: "Michael Chang",
    role: "Chief Revenue Officer",
    agency: "SecureLife Financial",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    metric: "$2.4M Added Revenue",
    quote:
      "Call attribution down to the dollar transformed how we buy leads. We only pay for billable, qualified conversations now.",
    tag: "Enterprise Call Center",
  },
  {
    id: 7,
    name: "Rachel Adams",
    role: "Managing Director",
    agency: "TrustCare Advisors",
    avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    metric: "+38% Retention",
    quote:
      "The seamless browser experience and automated disposition make after-call work take 3 seconds instead of 5 minutes.",
    tag: "Health & P&C",
  },
  {
    id: 8,
    name: "Anthony Rivera",
    role: "Senior Partner",
    agency: "Horizon Mutual Group",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    metric: "12,000+ Calls/Mo",
    quote:
      "Handling thousands of concurrent calls without dropped lines or latency jitter. Coverage Calls is hands down the gold standard.",
    tag: "High-Volume Direct",
  },
];

export default function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const [cmsRow1, setCmsRow1] = useState<typeof testimonialsRow1 | null>(null);
  const [cmsRow2, setCmsRow2] = useState<typeof testimonialsRow2 | null>(null);

  useEffect(() => {
    fetch("/api/v1/cms")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const rows: { slug: string; content: { items?: { name: string; role: string; quote: string }[] } }[] = body?.data ?? [];
        const t = rows.find((x) => x.slug === "testimonials");
        const items = t?.content?.items ?? [];
        if (items.length >= 2) {
          const mapped = items.map((it, i) => ({
            id: 100 + i,
            name: it.name || `Customer ${i + 1}`,
            role: it.role || "Customer",
            agency: (it as { agency?: string }).agency || "Coverage Calls",
            avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(it.name || i)}`,
            rating: 5,
            metric: "Verified",
            quote: it.quote,
            tag: "Customer",
          }));
          const half = Math.ceil(mapped.length / 2);
          setCmsRow1(mapped.slice(0, half) as typeof testimonialsRow1);
          setCmsRow2((mapped.slice(half).length ? mapped.slice(half) : mapped) as typeof testimonialsRow2);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Entrance
      const headerEl = sectionRef.current?.querySelector(`.${styles.header}`);
      if (headerEl) {
        gsap.from(headerEl, {
          opacity: 0,
          y: 35,
          duration: 0.9,
          ease: "power3.out",
          clearProps: "opacity,transform",
        });
      }

      const r1 = row1Ref.current;
      const r2 = row2Ref.current;
      if (!r1 || !r2) return;

      // Row 1: Leftward — duplicate ensures seamless loop
      const r1Width = r1.scrollWidth / 2;
      const tween1 = gsap.to(r1, {
        x: -r1Width,
        duration: 32,
        ease: "none",
        repeat: -1,
      });

      // Row 2: Rightward — start offset then move to 0
      const r2Width = r2.scrollWidth / 2;
      gsap.set(r2, { x: -r2Width });
      const tween2 = gsap.to(r2, {
        x: 0,
        duration: 36,
        ease: "none",
        repeat: -1,
      });

      // Hover: slow to 0.2x instead of hard pause — smoother
      const onEnter1 = () => gsap.to(tween1, { timeScale: 0.2, duration: 0.5, overwrite: true });
      const onLeave1 = () => gsap.to(tween1, { timeScale: 1, duration: 0.5, overwrite: true });
      const onEnter2 = () => gsap.to(tween2, { timeScale: 0.2, duration: 0.5, overwrite: true });
      const onLeave2 = () => gsap.to(tween2, { timeScale: 1, duration: 0.5, overwrite: true });

      r1.addEventListener("mouseenter", onEnter1);
      r1.addEventListener("mouseleave", onLeave1);
      r2.addEventListener("mouseenter", onEnter2);
      r2.addEventListener("mouseleave", onLeave2);

      // Cleanup listeners on revert — gsap.context handles tween kill, but remove listeners manually
      return () => {
        r1.removeEventListener("mouseenter", onEnter1);
        r1.removeEventListener("mouseleave", onLeave1);
        r2.removeEventListener("mouseenter", onEnter2);
        r2.removeEventListener("mouseleave", onLeave2);
      };
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const renderCard = (item: (typeof testimonialsRow1)[0], idx: number) => (
    <div key={`${item.id}-${idx}`} className={styles.card}>
      <div className={styles.cardGlow} />
      <div className={styles.cardHeader}>
        <div className={styles.agentInfo}>
          <div className={styles.avatarWrapper}>
            {/* eslint-disable @next/next/no-img-element */}
            <img src={item.avatar} alt={item.name} className={styles.avatar} loading="lazy" />
            <span className={styles.statusDot} />
          </div>
          <div>
            <h4 className={styles.agentName}>{item.name}</h4>
            <p className={styles.agentRole}>
              {item.role} • <span>{item.agency}</span>
            </p>
          </div>
        </div>
        <div className={styles.metricBadge}>{item.metric}</div>
      </div>
      <p className={styles.quoteText}>&ldquo;{item.quote}&rdquo;</p>
      <div className={styles.cardFooter}>
        <div className={styles.stars}>
          {[...Array(5)].map((_, i) => (
            <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#a855f7" aria-hidden>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ))}
        </div>
        <span className={styles.tag}>{item.tag}</span>
      </div>
    </div>
  );

  return (
    <section id="testimonials" className={styles.testimonialsWrapper} ref={sectionRef}>
      <div className={styles.ambientLight} aria-hidden />
      <div className={styles.header}>
        <div className={styles.pillBadge}>
          <span className={styles.pillDot} />
          <span>PROVEN BY TOP AGENTS</span>
        </div>
        <h2 className={styles.title}>
          Trusted by the best. <br />
          <span className={styles.gradientText}>Validated by every call.</span>
        </h2>
        <p className={styles.subtitle}>
          Over 1,200+ agents and high-growth agencies rely on Coverage Calls to qualify, route, and close inbound
          leads with zero friction.
        </p>
      </div>

      <div className={styles.sliderContainer}>
        <div className={styles.sliderTrack} ref={row1Ref}>
          {(cmsRow1 ?? testimonialsRow1).concat(cmsRow1 ?? testimonialsRow1).map((item, idx) => renderCard(item as (typeof testimonialsRow1)[0], idx))}
        </div>
        <div className={styles.sliderTrack} ref={row2Ref}>
          {(cmsRow2 ?? testimonialsRow2).concat(cmsRow2 ?? testimonialsRow2).map((item, idx) => renderCard(item as (typeof testimonialsRow2)[0], idx))}
        </div>
      </div>

      <div className={styles.proofBar}>
        <div className={styles.proofItem}>
          <span className={styles.proofValue}>99.98%</span>
          <span className={styles.proofLabel}>WebRTC Call Uptime</span>
        </div>
        <div className={styles.proofDivider} />
        <div className={styles.proofItem}>
          <span className={styles.proofValue}>4.9 / 5.0</span>
          <span className={styles.proofLabel}>Agent Satisfaction</span>
        </div>
        <div className={styles.proofDivider} />
        <div className={styles.proofItem}>
          <span className={styles.proofValue}>1.8M+</span>
          <span className={styles.proofLabel}>Billable Calls Routed</span>
        </div>
        <div className={styles.proofDivider} />
        <div className={styles.proofItem}>
          <span className={styles.proofValue}>&lt; 150ms</span>
          <span className={styles.proofLabel}>Ultra-low Latency</span>
        </div>
      </div>
    </section>
  );
}
