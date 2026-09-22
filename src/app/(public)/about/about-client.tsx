"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./about.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const STATS = [
  { ref: "c1", endVal: 500, suffix: "M+", isDecimal: false, icon: "group", value: "500M+", label: "Calls Connected" },
  { ref: "c2", endVal: 1000, suffix: "+", isDecimal: false, icon: "check", value: "1,000+", label: "Active Partners" },
  { ref: "c3", endVal: 190, suffix: "+", isDecimal: false, icon: "globe", value: "190+", label: "Countries & Regions" },
  { ref: "c4", endVal: 99.9, suffix: "%", isDecimal: true, icon: "shield", value: "99.9%", label: "Platform Uptime" },
] as const;

export default function AboutClient() {
  const mainRef = useRef<HTMLDivElement>(null);
  const badge1Ref = useRef<HTMLDivElement>(null);
  const badge2Ref = useRef<HTMLDivElement>(null);
  const badge3Ref = useRef<HTMLDivElement>(null);
  const countRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      gsap.from(`.${styles.heroBreadcrumb} > *`, { opacity: 0, y: -15, duration: 0.6 });
      gsap.from(`.${styles.heroContent} > *:not(.${styles.heroBreadcrumb})`, {
        opacity: 0,
        y: 30,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
      });
      gsap.from(`.${styles.heroGlobeWrap}`, { opacity: 0, scale: 0.92, duration: 1.2, ease: "power3.out" });
      gsap.from(`.${styles.floatingCard}`, { opacity: 0, scale: 0.7, stagger: 0.2, duration: 0.7, ease: "power3.out" });

      if (!reduceMotion) {
        gsap.to([badge1Ref.current, badge3Ref.current], {
          y: -10, duration: 3, repeat: -1, yoyo: true, ease: "sine.inOut",
        });
        gsap.to(badge2Ref.current, {
          y: 10, duration: 3.6, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 0.5,
        });
      }

      ScrollTrigger.create({
        trigger: `.${styles.statsPanel}`,
        start: "top 80%",
        once: true,
        onEnter: () => {
          STATS.forEach((item) => {
            const obj = { val: 0 };
            gsap.to(obj, {
              val: item.endVal,
              duration: 2.2,
              ease: "power2.out",
              onUpdate: () => {
                const el = countRefs.current[item.ref];
                if (el) {
                  el.textContent = item.isDecimal
                    ? obj.val.toFixed(1) + item.suffix
                    : Math.floor(obj.val).toLocaleString() + item.suffix;
                }
              },
            });
          });
        },
      });

      gsap.from(`.${styles.missionLeft}`, {
        scrollTrigger: { trigger: `.${styles.missionSection}`, start: "top 75%" },
        opacity: 0, x: -40, duration: 0.9, ease: "power3.out",
      });
      gsap.from(`.${styles.missionCard}`, {
        scrollTrigger: { trigger: `.${styles.missionCardsGrid}`, start: "top 80%" },
        opacity: 0, y: 35, stagger: 0.2, duration: 0.8, ease: "power2.out",
      });
      gsap.from(`.${styles.impactMapCol}`, {
        scrollTrigger: { trigger: `.${styles.impactSection}`, start: "top 75%" },
        opacity: 0, x: -40, duration: 1, ease: "power3.out",
      });
      gsap.from(`.${styles.impactContentCol}`, {
        scrollTrigger: { trigger: `.${styles.impactSection}`, start: "top 75%" },
        opacity: 0, x: 40, duration: 1, ease: "power3.out",
      });
      gsap.from(`.${styles.ctaCardBanner}`, {
        scrollTrigger: { trigger: `.${styles.ctaCardBanner}`, start: "top 85%" },
        opacity: 0, y: 50, scale: 0.97, duration: 1, ease: "power3.out",
      });
    }, mainRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className={styles.pageWrapper} ref={mainRef}>
      {/* ===================== HERO SECTION ===================== */}
      <section className={styles.heroSection}>
        <div className={`${styles.container} ${styles.heroGrid}`}>
          <div className={styles.heroContent}>
            <div className={styles.heroBreadcrumb}>
              <Link href="/">Home</Link>
              <span className={styles.breadcrumbSeparator}>&gt;</span>
              <span className={styles.current}>About Us</span>
            </div>

            <div className={styles.heroBadge}>
              <span className={styles.badgeText}>OUR STORY</span>
            </div>

            <h1 className={styles.heroTitle}>
              Built for a more <br />
              <span className={styles.gradientText}>connected world.</span>
            </h1>

            <p className={styles.heroDesc}>
              At Coverage Calls, we power the infrastructure behind billions of
              conversations. We help businesses, agencies and publishers
              connect people across the globe — faster, smarter and more
              reliably.
            </p>

            <div className={styles.heroButtons}>
              <Link href="#mission" className={`${styles.btnPrimaryPill} ${styles.heroCta}`}>
                Our Mission <span aria-hidden>→</span>
              </Link>
              <Link href="/contact" className={styles.btnSecondaryPill}>
                Talk to Us
              </Link>
            </div>

            <div className={styles.heroFeaturesRow}>
              <div className={styles.heroFeatureItem}>
                <GlobeIcon />
                <span>Global Reach</span>
              </div>
              <div className={styles.heroFeatureItem}>
                <ShieldCheckIcon />
                <span>Trusted by Partners</span>
              </div>
              <div className={styles.heroFeatureItem}>
                <LayersIcon />
                <span>Built for Scale</span>
              </div>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroGlobeWrap}>
              <div className={styles.globeAmbientGlow} />
              <Image
                src="/images/globe.png"
                alt="Global telecommunications coverage"
                width={700}
                height={700}
                priority
                className={styles.heroGlobeImg}
              />

              <div className={`${styles.floatingCard} ${styles.badgeTopLeft}`} ref={badge1Ref}>
                <div className={styles.floatingCardIconBox}>
                  <BarChartIcon />
                </div>
                <div className={styles.floatingCardText}>
                  <strong>Millions</strong>
                  <span>of calls daily</span>
                </div>
              </div>

              <div className={`${styles.floatingCard} ${styles.badgeMidRight}`} ref={badge2Ref}>
                <div className={styles.floatingCardIconBox}>
                  <UsersIcon />
                </div>
                <div className={styles.floatingCardText}>
                  <strong>Connecting</strong>
                  <span>businesses</span>
                </div>
              </div>

              <div className={`${styles.floatingCard} ${styles.badgeBottomLeft}`} ref={badge3Ref}>
                <div className={styles.floatingCardIconBox}>
                  <PhoneCallIcon />
                </div>
                <div className={styles.floatingCardText}>
                  <strong>Real people.</strong>
                  <span>Real conversations.</span>
                </div>
              </div>

              <div className={styles.handwrittenText} aria-hidden>
                People
                <br />
                Conversations
                <br />
                Growth
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== STATS BAR ===================== */}
      <section className={styles.statsSection}>
        <div className={styles.container}>
          <div className={styles.statsPanel}>
            {STATS.map((s, i) => (
              <React.Fragment key={s.ref}>
                {i > 0 && <div className={styles.statDivider} />}
                <div className={styles.statCard}>
                  <div className={styles.statIconWrapper}>
                    {s.icon === "group" ? <UsersGroupIcon /> : s.icon === "check" ? <UserCheckIcon /> : s.icon === "globe" ? <GlobeIcon /> : <ShieldCheckIcon />}
                  </div>
                  <div className={styles.statValue}>
                    <span ref={(el) => { countRefs.current[s.ref] = el; }}>{s.value}</span>
                  </div>
                  <div className={styles.statLabel}>{s.label}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== OUR MISSION SECTION ===================== */}
      <section className={styles.missionSection} id="mission">
        <div className={styles.container}>
          <div className={`${styles.heroBadge} ${styles.missionBadge}`}>
            <span className={styles.badgeText}>OUR MISSION</span>
          </div>

          <div className={styles.missionGrid}>
            <div className={styles.missionLeft}>
              <h2 className={styles.sectionTitle}>
                Enabling conversations that{" "}
                <span className={styles.gradientText}>create opportunity.</span>
              </h2>
              <p className={styles.sectionDesc}>
                We believe every conversation has the power to create
                opportunity — for businesses, for individuals and for a more
                connected world. Our mission is to make global communication
                simple, reliable and accessible for everyone.
              </p>
              <Link href="/blog" className={`${styles.btnPrimaryPill} ${styles.missionBtn}`}>
                Learn More <span aria-hidden>→</span>
              </Link>
            </div>

            <div className={styles.missionCardsGrid}>
              <div className={styles.missionCard}>
                <div className={styles.missionIconBox}>
                  <TargetIcon />
                </div>
                <h3 className={styles.missionCardTitle}>Be the most trusted platform</h3>
                <p className={styles.missionCardText}>
                  We strive to be the most reliable and transparent
                  communications platform in the industry.
                </p>
              </div>

              <div className={styles.missionCard}>
                <div className={styles.missionIconBox}>
                  <LightningIcon />
                </div>
                <h3 className={styles.missionCardTitle}>Drive innovation</h3>
                <p className={styles.missionCardText}>
                  We continuously build smarter tools and technology to solve
                  real-world communication challenges.
                </p>
              </div>

              <div className={styles.missionCard}>
                <div className={styles.missionIconBox}>
                  <UsersThreeIcon />
                </div>
                <h3 className={styles.missionCardTitle}>Grow together</h3>
                <p className={styles.missionCardText}>
                  We succeed when our partners succeed. Our growth is built on
                  long-term relationships.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== GLOBAL IMPACT SECTION ===================== */}
      <section className={styles.impactSection}>
        <div className={`${styles.container} ${styles.impactGrid}`}>
          <div className={styles.impactMapCol}>
            <div className={styles.mapImageWrapper}>
              <Image
                src="/images/map.png"
                alt="Global network coverage map"
                width={850}
                height={450}
                className={styles.impactMapImg}
              />
              <div className={styles.mapFloatingBadge}>
                <GlobeIcon />
                <span>Connecting 190+ countries</span>
              </div>
            </div>
          </div>

          <div className={styles.impactContentCol}>
            <div className={`${styles.heroBadge} ${styles.impactBadge}`}>
              <span className={styles.badgeText}>GLOBAL IMPACT</span>
            </div>

            <h2 className={styles.sectionTitle}>
              A truly global <br />
              <span className={styles.gradientText}>communications network.</span>
            </h2>

            <p className={styles.sectionDesc}>
              From emerging markets to global enterprises, our platform helps
              bridge distances and open new opportunities. With partners across
              190+ countries, we&apos;re building a more connected, more inclusive
              future.
            </p>

            <div className={styles.impactFeaturesRow}>
              <div className={styles.impactFeatureCol}>
                <GlobeIcon />
                <span>Worldwide<br />Coverage</span>
              </div>
              <div className={styles.impactFeatureCol}>
                <BarChartIcon />
                <span>Scalable<br />Infrastructure</span>
              </div>
              <div className={styles.impactFeatureCol}>
                <ShieldCheckIcon />
                <span>Secure &amp;<br />Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== JOIN OUR JOURNEY CTA BANNER ===================== */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaCardBanner}>
            <div className={styles.ctaCardAurora} />
            <div className={styles.ctaCardContent}>
              <div className={`${styles.heroBadge} ${styles.ctaBadge}`}>
                <span className={styles.badgeText}>JOIN OUR JOURNEY</span>
              </div>
              <h2 className={styles.ctaHeading}>Let&apos;s build a more connected tomorrow.</h2>
              <p className={styles.ctaSubheading}>
                Whether you&apos;re a business, agency or publisher, we&apos;re here to
                help you grow with the power of conversations.
              </p>
            </div>
            <div className={styles.ctaButtonWrap}>
              <Link href="/register" className={styles.btnWhitePill}>
                Get Started Today <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* Inline SVG icons (feather-style, currentColor where interactive) */

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <polyline points="9 12 11 14 15 10"></polyline>
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
      <polyline points="2 17 12 22 22 17"></polyline>
      <polyline points="2 12 12 17 22 12"></polyline>
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  );
}

function PhoneCallIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94m-1 7.98v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
  );
}

function UsersGroupIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  );
}

function UserCheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="8.5" cy="7" r="4"></circle>
      <polyline points="17 11 19 13 23 9"></polyline>
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="6"></circle>
      <circle cx="12" cy="12" r="2"></circle>
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  );
}

function UsersThreeIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  );
}
