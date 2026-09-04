"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./ProcessSection.module.css";

gsap.registerPlugin(ScrollTrigger);

// Top Logos
const logos = [
  {
    name: "Pinnacle",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    name: "HealthFirst",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        <path d="M12 7v6M9 10h6" />
      </svg>
    ),
  },
  {
    name: "TrustCare",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    name: "SecureLife",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
  {
    name: "Apex Benefits",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20h16M12 4L4 20M12 4l8 16M7.5 14h9" />
      </svg>
    ),
  },
  {
    name: "Unity Health",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4v8a6 6 0 0 0 12 0V4" />
      </svg>
    ),
  },
];

// Interactive Animated Steps Data
const steps = [
  {
    step: "01",
    title: "We run the ads",
    desc: "High-intent campaigns reach people actively looking for coverage.",
    icon: (
      <div className={styles.iconAdContainer}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="3" rx="2" className={styles.adScreen} />
          <line x1="8" x2="16" y1="21" y2="21" />
          <line x1="12" x2="12" y1="17" y2="21" />
          <circle cx="7.5" cy="8.5" r="1.5" className={styles.adDot1} fill="currentColor" />
          <circle cx="16.5" cy="8.5" r="1.5" className={styles.adDot2} fill="currentColor" />
          <path d="M7 13h10" strokeDasharray="3 2" className={styles.adLine} />
        </svg>
        <span className={styles.clickEffect} />
      </div>
    ),
  },
  {
    step: "02",
    title: "Prospects call in",
    desc: "Calls are verified and matched to the right campaign and licensed status.",
    icon: (
      <div className={styles.iconUserContainer}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="7.5" r="4" className={styles.userHead} />
          <path d="M5.5 20.5v-1.5a6.5 6.5 0 0 1 13 0v1.5" className={styles.userBody} />
        </svg>
        <div className={styles.radarPing} />
      </div>
    ),
  },
  {
    step: "03",
    title: "Calls route to you",
    desc: "Live calls land in your browser instantly—no phone system needed.",
    icon: (
      <div className={styles.iconPhoneContainer}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
            className={styles.phoneBody}
          />
          <path d="M14 2a9 9 0 0 1 8 8" className={styles.phoneWaveOuter} />
          <path d="M14 6a5 5 0 0 1 4 4" className={styles.phoneWaveInner} />
        </svg>
      </div>
    ),
  },
  {
    step: "04",
    title: "You have the conversation",
    desc: "Talk, qualify, and close. Every call is recorded and tracked for quality.",
    icon: (
      <div className={styles.iconWaveContainer}>
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="3" y2="12" className={`${styles.eqBar} ${styles.eq1}`} />
          <line x1="6.5" y1="9" x2="6.5" y2="15" className={`${styles.eqBar} ${styles.eq2}`} />
          <line x1="10" y1="5" x2="10" y2="19" className={`${styles.eqBar} ${styles.eq3}`} />
          <line x1="13.5" y1="2" x2="13.5" y2="22" className={`${styles.eqBar} ${styles.eq4}`} />
          <line x1="17" y1="7" x2="17" y2="17" className={`${styles.eqBar} ${styles.eq5}`} />
          <line x1="20.5" y1="10" x2="20.5" y2="14" className={`${styles.eqBar} ${styles.eq6}`} />
        </svg>
      </div>
    ),
  },
  {
    step: "05",
    title: "We handle the rest",
    desc: "You only pay for qualified, billable calls. Everything stays transparent.",
    icon: (
      <div className={styles.iconCheckContainer}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" className={styles.animatedCheck} />
        </svg>
      </div>
    ),
  },
];

export default function ProcessSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const streamPath1 = useRef<SVGPathElement>(null);
  const streamPath2 = useRef<SVGPathElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Intro entrance sequence
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          toggleActions: "play none none none",
        },
      });

      tl.from(`.${styles.stepCircle}`, {
        scale: 0.4,
        opacity: 0,
        stagger: 0,
        duration: 0.7,
        ease: "back.out(1.8)",
        immediateRender: false,
      }).from(
        `.${styles.stepContent}`,
        {
          y: 20,
          opacity: 0,
          stagger: 0.08,
          duration: 0.6,
          ease: "power2.out",
          immediateRender: false,
        },
        "-=0.3"
      );

      // Continuous Streaming Beam Animation on Connecting Neon Line
      gsap.to([streamPath1.current, streamPath2.current], {
        strokeDashoffset: -400,
        repeat: -1,
        duration: 3.5,
        ease: "none",
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className={styles.wrapper}>
      {/* Background Neon Lights */}
      <div className={styles.topGlow} />
      <div className={styles.centerGlow} />

      {/* TOP: TRUSTED BY GROWING TEAMS */}
      <div className={styles.topSection}>
        <div className={styles.trustedHeader}>
          <span className={styles.line} />
          <span className={styles.trustedText}>TRUSTED BY GROWING TEAMS</span>
          <span className={styles.line} />
        </div>

        <div className={styles.logoGrid}>
          {logos.map((logo, index) => (
            <div key={index} className={styles.logoItem}>
              <span className={styles.logoIcon}>{logo.icon}</span>
              <span className={styles.logoName}>{logo.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.sectionDivider} />

      {/* MAIN: HOW IT WORKS */}
      <div className={styles.mainContent}>
        <div className={styles.headerGroup}>
          <span className={styles.badge}>HOW IT WORKS</span>
          <h2 className={styles.title}>From ad click to closed policy</h2>
        </div>

        {/* TIMELINE / PROCESS GRID */}
        <div className={styles.timelineContainer}>
          {/* Animated Connecting Glowing Neon SVG Curve */}
          <div className={styles.svgWrapper}>
            <svg
              className={styles.connectorSvg}
              viewBox="0 0 1000 60"
              fill="none"
              preserveAspectRatio="none"
            >
              {/* Subtle Base Glowing Path */}
              <path
                d="M 100 30 Q 200 24, 300 30 T 500 30 T 700 30 T 900 30"
                stroke="#6b21a8"
                strokeWidth="4"
                strokeOpacity="0.45"
                strokeLinecap="round"
                className={styles.basePathGlow}
              />
              <path
                d="M 100 30 Q 200 24, 300 30 T 500 30 T 700 30 T 900 30"
                stroke="#a855f7"
                strokeWidth="1.5"
                strokeOpacity="0.7"
                strokeLinecap="round"
              />

              {/* Infinite Continuous Glowing Pulse / Energy Beams */}
              <path
                ref={streamPath1}
                d="M 100 30 Q 200 24, 300 30 T 500 30 T 700 30 T 900 30"
                stroke="#c084fc"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="60 140"
                className={styles.pulsingGlowStream}
              />
              <path
                ref={streamPath2}
                d="M 100 30 Q 200 24, 300 30 T 500 30 T 700 30 T 900 30"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="60 140"
                className={styles.pulsingCoreStream}
              />
            </svg>
          </div>

          {/* 5 Process Steps */}
          <div className={styles.stepsGrid}>
            {steps.map((item, index) => (
              <div key={index} className={styles.stepColumn}>
                {/* Glowing Animated Circle Node */}
                <div className={styles.circleAnchor}>
                  <div className={styles.stepCircle}>
                    <div className={styles.circleInnerGlow} />
                    <div className={styles.stepIcon}>{item.icon}</div>
                  </div>
                </div>

                {/* Step Text Info */}
                <div className={styles.stepContent}>
                  <span className={styles.stepNumber}>{item.step}</span>
                  <h3 className={styles.stepTitle}>{item.title}</h3>
                  <p className={styles.stepDescription}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
