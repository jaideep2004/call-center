'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import styles from './FeaturesAndPricing.module.css';

// --- Icons ---
const PhoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    <path d="M14.05 2a9 9 0 0 1 8 7.94" />
    <path d="M14.05 6A5 5 0 0 1 18 10" />
  </svg>
);

const LightningIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
    <rect x="7" y="14" width="2" height="4" />
    <rect x="11" y="10" width="2" height="8" />
    <rect x="15" y="6" width="2" height="12" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// --- Data ---
const featuresData = [
  {
    icon: <PhoneIcon />,
    title: 'WebRTC Calling',
    desc: 'Crystal clear calls right in your browser. No plugins, no hassle.',
  },
  {
    icon: <LightningIcon />,
    title: 'Real-Time Routing',
    desc: 'Smart routing connects callers to the best available agent instantly.',
    active: true,
  },
  {
    icon: <MicIcon />,
    title: 'Call Recording',
    desc: '100% call recording with transcripts for training and compliance.',
  },
  {
    icon: <UsersIcon />,
    title: 'Agent Management',
    desc: 'Add agents, set permissions, and track performance.',
  },
  {
    icon: <ChartIcon />,
    title: 'Campaign Tracking',
    desc: 'See which campaigns drive the best calls and conversions.',
  },
  {
    icon: <ShieldIcon />,
    title: 'Secure & Compliant',
    desc: 'Enterprise-grade security and compliance you can count on.',
  },
];

const pricingData = [
  {
    name: 'Agent',
    price: '$97',
    period: '/mo',
    desc: 'For individual agents taking inbound calls.',
    features: [
      '7-day free trial',
      'Live inbound calls',
      'Full call logs & recordings',
      'Scripts & lead context',
    ],
    highlighted: false,
  },
  {
    name: 'Agency',
    badge: 'MOST POPULAR',
    price: '$147',
    period: '/mo',
    desc: 'For teams managing a growing group of agents.',
    features: [
      'Everything in Agent',
      'Team analytics & leaderboards',
      'Whisper coaching',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    name: 'White-Label',
    price: '$499',
    period: '/mo',
    desc: 'For agencies ready to launch their own brand.',
    features: [
      'Everything in Agency',
      'Custom branding & domain',
      'Agent & client portals',
      'Dedicated onboarding',
    ],
    highlighted: false,
  },
];

export default function FeaturesAndPricing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeFeature, setActiveFeature] = useState<number>(1);
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pausedRef = useRef(false);

  // Auto-cycle highlight across feature cards (pauses on hover, resumes on leave)
  useEffect(() => {
    const startInterval = () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      autoTimerRef.current = setInterval(() => {
        if (pausedRef.current) return;
        setActiveFeature((prev) => (prev + 1) % featuresData.length);
      }, 2200);
    };
    startInterval();
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, []);

  const handleMouseEnter = (idx: number) => {
    pausedRef.current = true;
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    setActiveFeature(idx);
  };

  const handleMouseLeave = () => {
    pausedRef.current = false;
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    autoTimerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      setActiveFeature((prev) => (prev + 1) % featuresData.length);
    }, 2200);
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Scope selectors to this section only — avoids hashed-class global miss
      const featureCards = containerRef.current?.querySelectorAll(`.${styles.featureCard}`);
      const pricingHeaderEl = containerRef.current?.querySelector(`.${styles.pricingHeader}`);
      const pricingCards = containerRef.current?.querySelectorAll(`.${styles.pricingCard}`);

      if (featureCards && featureCards.length) {
        gsap.from(featureCards, {
          opacity: 0,
          y: 20,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
          clearProps: 'opacity,transform',
        });
      }

      if (pricingHeaderEl) {
        gsap.from(pricingHeaderEl, {
          opacity: 0,
          y: 15,
          duration: 0.8,
          delay: 0.3,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        });
      }

      if (pricingCards && pricingCards.length) {
        gsap.from(pricingCards, {
          opacity: 0,
          y: 30,
          duration: 0.8,
          stagger: 0.12,
          delay: 0.4,
          ease: 'power3.out',
          clearProps: 'opacity,transform',
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className={styles.wrapper} ref={containerRef} id="features-pricing">
      {/* Background radial glow */}
      <div className={styles.ambientGlow} />

      <div className={styles.container}>
        <div id="features" />
        {/* --- Top Section: Features --- */}
        <div className={styles.featuresSection}>
          <div className={styles.featureHeader}>
            <span className={styles.purpleText}>POWERFUL FEATURES.</span>
            <span className={styles.whiteText}> SIMPLE TO USE.</span>
          </div>

          <div className={styles.featuresGrid} onMouseLeave={handleMouseLeave}>
            {featuresData.map((item, idx) => {
              const isSelected = activeFeature === idx;
              return (
                <div
                  key={idx}
                  className={`${styles.featureCard} ${isSelected ? styles.featureCardActive : ''}`}
                  onMouseEnter={() => handleMouseEnter(idx)}
                >
                  <div className={styles.iconContainer}>{item.icon}</div>
                  <h3 className={styles.featureTitle}>{item.title}</h3>
                  <p className={styles.featureDesc}>{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div id="pricing" />
        {/* --- Bottom Section: Pricing --- */}
        <div className={styles.pricingSection}>
          <div className={styles.pricingHeader}>
            <span className={styles.pricingSub}>SIMPLE, SCALABLE PRICING</span>
            <h2 className={styles.pricingTitle}>Start small. Scale big.</h2>
          </div>

          <div className={styles.pricingGrid}>
            {pricingData.map((plan, idx) => (
              <div
                key={idx}
                className={`${styles.pricingCard} ${plan.highlighted ? styles.pricingCardHighlighted : ''}`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderTop}>
                    <span className={styles.planName}>{plan.name}</span>
                    {plan.badge && <span className={styles.badge}>{plan.badge}</span>}
                  </div>
                  <div className={styles.priceRow}>
                    <span className={styles.price}>{plan.price}</span>
                    <span className={styles.period}>{plan.period}</span>
                  </div>
                  <p className={styles.planDesc}>{plan.desc}</p>
                </div>

                <div className={styles.featuresList}>
                  {plan.features.map((feature, fIdx) => (
                    <div key={fIdx} className={styles.featureItem}>
                      <span className={styles.checkIcon}>
                        <CheckIcon />
                      </span>
                      <span className={styles.featureLabel}>{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  className={`${styles.ctaBtn} ${plan.highlighted ? styles.ctaBtnPrimary : styles.ctaBtnSecondary}`}
                >
                  Start free trial
                </button>
              </div>
            ))}
          </div>

          <p className={styles.footerNote}>
            All plans include a 7-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
