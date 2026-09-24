'use client';

import styles from "./ab2.module.css";
import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ChevronRight,
  ArrowRight,
  Globe,
  ShieldCheck,
  BarChart3,
  Users,
  UserCheck,
  PhoneCall,
  Target,
  Zap,
  Lock,
} from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function AboutPage() {
  const mainRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  const scriptTextRef = useRef<HTMLDivElement>(null);

  const statsContainerRef = useRef<HTMLDivElement>(null);
  const stat1NumRef = useRef<HTMLDivElement>(null);
  const stat2NumRef = useRef<HTMLDivElement>(null);
  const stat3NumRef = useRef<HTMLDivElement>(null);
  const stat4NumRef = useRef<HTMLDivElement>(null);

  const mapBadgeRef = useRef<HTMLDivElement>(null);

  // 1. Interactive Starfield / Particle Shader Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = Math.max(
      document.documentElement.scrollHeight,
      window.innerHeight * 2.5
    ));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = Math.max(
        document.documentElement.scrollHeight,
        window.innerHeight * 2.5
      );
    };
    window.addEventListener('resize', handleResize);

    interface Particle {
      x: number;
      y: number;
      radius: number;
      alpha: number;
      baseAlpha: number;
      vx: number;
      vy: number;
      color: string;
    }

    const particles: Particle[] = [];
    const particleCount = 70;
    const colors = ['#c084fc', '#a855f7', '#818cf8', '#e9d5ff', '#ffffff'];

    for (let i = 0; i < particleCount; i++) {
      const baseAlpha = Math.random() * 0.55 + 0.2;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.8 + 0.6,
        alpha: baseAlpha,
        baseAlpha: baseAlpha,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let tick = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      tick += 0.015;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        p.alpha = p.baseAlpha + Math.sin(tick * 2 + p.x) * 0.25;
        if (p.alpha < 0.1) p.alpha = 0.1;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 2. GSAP Entrance, Idle Floating & Counter Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero Entrance Timeline
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      heroTl
        .fromTo(
          '.breadcrumbs',
          { opacity: 0, y: -10 },
          { opacity: 1, y: 0, duration: 0.5, clearProps: 'all' }
        )
        .fromTo(
          '.hero-left .badge-pill',
          { opacity: 0, scale: 0.9, y: 15 },
          { opacity: 1, scale: 1, y: 0, duration: 0.5, clearProps: 'all' },
          '-=0.3'
        )
        .fromTo(
          '.hero-title',
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, clearProps: 'all' },
          '-=0.3'
        )
        .fromTo(
          '.hero-subtitle',
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.5, clearProps: 'all' },
          '-=0.4'
        )
        .fromTo(
          '.hero-actions',
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.5, clearProps: 'all' },
          '-=0.3'
        )
        .fromTo(
          '.hero-trust-row .trust-badge-item',
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, stagger: 0.08, duration: 0.4, clearProps: 'all' },
          '-=0.3'
        )
        .fromTo(
          '.hero-globe-edge-bg',
          { opacity: 0, scale: 0.94 },
          { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out', clearProps: 'transform' },
          '-=0.8'
        )
        .fromTo(
          [card1Ref.current, card2Ref.current, card3Ref.current],
          { opacity: 0, scale: 0.8, y: 15 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            stagger: 0.12,
            duration: 0.5,
            ease: 'back.out(1.5)',
            clearProps: 'opacity,scale',
          },
          '-=0.4'
        )
        .fromTo(
          scriptTextRef.current,
          { opacity: 0, rotation: -25, scale: 0.85 },
          {
            opacity: 1,
            rotation: -12,
            scale: 1,
            duration: 0.6,
            ease: 'back.out(1.3)',
            clearProps: 'opacity,scale',
          },
          '-=0.3'
        );

      // Continuous Floating Animations for Hero Cards
      gsap.to(card1Ref.current, {
        y: -10,
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.to(card2Ref.current, {
        y: 10,
        x: -4,
        duration: 3.6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.4,
      });

      gsap.to(card3Ref.current, {
        y: -9,
        x: 4,
        duration: 3.4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.7,
      });

      if (mapBadgeRef.current) {
        gsap.to(mapBadgeRef.current, {
          y: -7,
          duration: 2.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      // Stats Section Counter Animation
      if (statsContainerRef.current) {
        const countObj = { val1: 0, val2: 0, val3: 0, val4: 0 };

        gsap.to(countObj, {
          val1: 500,
          val2: 1000,
          val3: 190,
          val4: 99.9,
          duration: 2.0,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: statsContainerRef.current,
            start: 'top 95%',
            once: true,
          },
          onUpdate: () => {
            if (stat1NumRef.current) {
              stat1NumRef.current.innerText = `${Math.floor(countObj.val1)}M+`;
            }
            if (stat2NumRef.current) {
              stat2NumRef.current.innerText = `${Math.floor(countObj.val2).toLocaleString()}+`;
            }
            if (stat3NumRef.current) {
              stat3NumRef.current.innerText = `${Math.floor(countObj.val3)}+`;
            }
            if (stat4NumRef.current) {
              stat4NumRef.current.innerText = `${countObj.val4.toFixed(1)}%`;
            }
          },
        });
      }

      // Mission Creative Showcase Stagger Reveal
      gsap.fromTo(
        '.value-creative-card',
        { opacity: 0, y: 25 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.15,
          duration: 0.6,
          ease: 'power2.out',
          clearProps: 'all',
          scrollTrigger: {
            trigger: '.mission-section',
            start: 'top 85%',
            once: true,
          },
        }
      );

      // Global Impact Map & Content Reveal
      gsap.fromTo(
        '.impact-map-container',
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: 'power2.out',
          clearProps: 'all',
          scrollTrigger: {
            trigger: '.global-impact-section',
            start: 'top 85%',
            once: true,
          },
        }
      );

      // CTA Banner Reveal
      gsap.fromTo(
        '.cta-banner-container',
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          clearProps: 'all',
          scrollTrigger: {
            trigger: '.cta-section',
            start: 'top 90%',
            once: true,
          },
        }
      );

      ScrollTrigger.refresh();
    }, mainRef);

    return () => ctx.revert();
  }, []);

  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" />
    <div className={`${styles["ambient-wrapper"]}`} ref={mainRef}>
      {/* Interactive Space Starfield Canvas */}
      <canvas ref={canvasRef} className={`${styles["particle-canvas"]}`} />

      {/* ========================================================
          FULL-BLEED HERO SECTION
          Globe image pushed to the exact edge of screen
          Wave terrain spans 100% full width of screen
          ======================================================== */}
      <section className={`${styles["hero-fullbleed-section"]}`}>
        {/* Globe background image anchored to the exact right edge of the viewport */}
        <div className={`${styles["hero-globe-edge-bg"]}`} />
        <div className={`${styles["hero-ambient-aura"]}`} />

        {/* 100vw Full-Bleed Wavy Terrain Mesh overlay at bottom of hero */}
        <svg
          className={`${styles["hero-wave-terrain-fullbleed"]}`}
          viewBox="0 0 1440 180"
          fill="none"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 130 C360 60, 720 160, 1080 95 C1220 70, 1340 110, 1440 90 L1440 180 L0 180 Z"
            fill="url(#waveGrad1)"
            opacity="0.38"
          />
          <path
            d="M0 150 C300 100, 620 170, 960 115 C1180 80, 1320 140, 1440 125 L1440 180 L0 180 Z"
            fill="url(#waveGrad2)"
            opacity="0.52"
          />
          <defs>
            <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4c1d95" stopOpacity="0" />
              <stop offset="45%" stopColor="#7c3aed" stopOpacity="0.45" />
              <stop offset="85%" stopColor="#a855f7" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#25093e" stopOpacity="0.2" />
              <stop offset="55%" stopColor="#581c87" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#7e22ce" stopOpacity="0.35" />
            </linearGradient>
          </defs>
        </svg>

        {/* Inner Centered Content */}
        <div className={`${styles["hero-inner-container"]}`}>
          {/* Breadcrumb Navigation */}
          <nav className={`${styles["breadcrumbs"]}`} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className={`${styles["breadcrumb-separator"]}`}>
              <ChevronRight size={14} />
            </span>
            <span className={`${styles["breadcrumb-current"]}`}>About Us</span>
          </nav>

          <div className={`${styles["hero-grid"]}`}>
            {/* Left Content Column */}
            <div className={`${styles["hero-left"]}`}>
              <div className={`${styles["badge-pill"]}`}>OUR STORY</div>

              <h1 className={`${styles["hero-title"]}`}>
                Built for a more <br />
                <span className={`${styles["text-gradient-purple"]}`}>connected world.</span>
              </h1>

              <p className={`${styles["hero-subtitle"]}`}>
                At Coverage Calls, we power the infrastructure behind billions of
                conversations. We help businesses, agencies and publishers connect
                people across the globe — faster, smarter and more reliably.
              </p>

              <div className={`${styles["hero-actions"]}`}>
                <a href="#mission" className={`${styles["btn-primary"]}`}>
                  Our Mission <ArrowRight size={16} />
                </a>
                <a href="/contact" className={`${styles["btn-glass"]}`}>
                  Contact Us
                </a>
              </div>

              <div className={`${styles["hero-trust-row"]}`}>
                <div className={`${styles["trust-badge-item"]}`}>
                  <span className={`${styles["trust-icon-wrap"]}`}>
                    <Globe size={18} />
                  </span>
                  <span>Global Reach</span>
                </div>
                <div className={`${styles["trust-badge-item"]}`}>
                  <span className={`${styles["trust-icon-wrap"]}`}>
                    <ShieldCheck size={18} />
                  </span>
                  <span>Trusted by Partners</span>
                </div>
                <div className={`${styles["trust-badge-item"]}`}>
                  <span className={`${styles["trust-icon-wrap"]}`}>
                    <BarChart3 size={18} />
                  </span>
                  <span>Built for Scale</span>
                </div>
              </div>
            </div>

            {/* Right Column: Floating Glass Cards & Handwritten Accent */}
            <div className={`${styles["hero-right-overlay"]}`}>
              {/* Floating Card 1 (Top Left) */}
              <div
                className={`${styles["floating-glass-card"]} ${styles["card-pos-top-left"]}`}
                ref={card1Ref}
              >
                <div className={`${styles["card-icon-squircle"]}`}>
                  <BarChart3 size={18} />
                </div>
                <div className={`${styles["card-content-stack"]}`}>
                  <span className={`${styles["card-primary-text"]}`}>Millions</span>
                  <span className={`${styles["card-secondary-text"]}`}>of calls daily</span>
                </div>
              </div>

              {/* Floating Card 2 (Right) */}
              <div className={`${styles["floating-glass-card"]} ${styles["card-pos-right"]}`} ref={card2Ref}>
                <div className={`${styles["card-icon-squircle"]}`}>
                  <Users size={18} />
                </div>
                <div className={`${styles["card-content-stack"]}`}>
                  <span className={`${styles["card-primary-text"]}`}>Connecting</span>
                  <span className={`${styles["card-secondary-text"]}`}>businesses</span>
                </div>
              </div>

              {/* Floating Card 3 (Bottom Left) */}
              <div
                className={`${styles["floating-glass-card"]} ${styles["card-pos-bottom-left"]}`}
                ref={card3Ref}
              >
                <div className={`${styles["card-icon-squircle"]}`}>
                  <PhoneCall size={18} />
                </div>
                <div className={`${styles["card-content-stack"]}`}>
                  <span className={`${styles["card-primary-text"]}`}>Real people.</span>
                  <span className={`${styles["card-secondary-text"]}`}>
                    Real conversations.
                  </span>
                </div>
              </div>

              {/* Handwritten script text: People Conversations Growth */}
              <div className={`${styles["script-accent-wrapper"]}`} ref={scriptTextRef}>
                <div className={`${styles["script-text"]}`}>
                  People{'\n'}Conversations{'\n'}Growth
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          PAGE MAIN CONTENT CONTAINER
          ======================================================== */}
      <main className={`${styles["content-container"]}`}>
        {/* ========================================================
            STATS BAR SECTION (Glassmorphic 4-Column Pill)
            ======================================================== */}
        <section className={`${styles["stats-section"]}`}>
          <div className={`${styles["stats-glass-container"]}`} ref={statsContainerRef}>
            {/* Stat 1 */}
            <div className={`${styles["stat-column"]}`}>
              <div className={`${styles["stat-icon-wrapper"]}`}>
                <Users size={22} />
              </div>
              <div className={`${styles["stat-number"]}`} ref={stat1NumRef}>
                500M+
              </div>
              <div className={`${styles["stat-label"]}`}>Calls Connected</div>
            </div>

            {/* Stat 2 */}
            <div className={`${styles["stat-column"]}`}>
              <div className={`${styles["stat-icon-wrapper"]}`}>
                <UserCheck size={22} />
              </div>
              <div className={`${styles["stat-number"]}`} ref={stat2NumRef}>
                1,000+
              </div>
              <div className={`${styles["stat-label"]}`}>Active Partners</div>
            </div>

            {/* Stat 3 */}
            <div className={`${styles["stat-column"]}`}>
              <div className={`${styles["stat-icon-wrapper"]}`}>
                <Globe size={22} />
              </div>
              <div className={`${styles["stat-number"]}`} ref={stat3NumRef}>
                190+
              </div>
              <div className={`${styles["stat-label"]}`}>Countries & Regions</div>
            </div>

            {/* Stat 4 */}
            <div className={`${styles["stat-column"]}`}>
              <div className={`${styles["stat-icon-wrapper"]}`}>
                <ShieldCheck size={22} />
              </div>
              <div className={`${styles["stat-number"]}`} ref={stat4NumRef}>
                99.9%
              </div>
              <div className={`${styles["stat-label"]}`}>Platform Uptime</div>
            </div>
          </div>
        </section>

        {/* ========================================================
            OUR MISSION & PROFESSIONAL CREATIVE SHOWCASE
            ======================================================== */}
        <section className={`${styles["mission-section"]}`} id="mission">
          <div className={`${styles["mission-layout"]}`}>
            {/* Left Column */}
            <div className={`${styles["mission-left"]}`}>
              <div className={`${styles["badge-pill"]}`}>OUR MISSION</div>

              <h2 className={`${styles["mission-heading"]}`}>
                Enabling conversations that{' '}
                <span className={`${styles["text-gradient-purple"]}`}>create opportunity.</span>
              </h2>

              <p className={`${styles["mission-desc"]}`}>
                We believe every conversation has the power to create
                opportunity — for businesses, for individuals and for a more
                connected world. Our mission is to make global communication
                simple, reliable and accessible for everyone.
              </p>

              <a href="#impact" className={`${styles["btn-primary"]}`}>
                Learn More About Our Mission <ArrowRight size={16} />
              </a>
            </div>

            {/* Right Column: Professional Creative Showcase */}
            <div className={`${styles["mission-creative-container"]}`}>
              <div className={`${styles["mission-creative-glow"]}`} />

              <div className={`${styles["mission-cards-grid"]}`}>
                {/* Pillar Card 1 */}
                <div className={`${styles["value-creative-card"]}`}>
                  <div className={`${styles["value-card-header"]}`}>
                    <div className={`${styles["value-icon-box"]}`}>
                      <Target size={24} />
                    </div>
                    <span className={`${styles["value-status-tag"]}`}>ENTERPRISE</span>
                  </div>
                  <h3 className={`${styles["value-title"]}`}>Be the most trusted platform</h3>
                  <p className={`${styles["value-description"]}`}>
                    We strive to be the most reliable and transparent
                    communications platform in the industry.
                  </p>
                  <div className={`${styles["value-card-metric"]}`}>
                    <span className={`${styles["metric-highlight"]}`}>99.99% Reliability</span>
                    <span className={`${styles["metric-pill-dot"]}`}>
                      <span className={`${styles["metric-pulse-dot"]}`} /> Live
                    </span>
                  </div>
                </div>

                {/* Pillar Card 2 */}
                <div className={`${styles["value-creative-card"]}`}>
                  <div className={`${styles["value-card-header"]}`}>
                    <div className={`${styles["value-icon-box"]}`}>
                      <Zap size={24} />
                    </div>
                    <span className={`${styles["value-status-tag"]}`}>AI POWERED</span>
                  </div>
                  <h3 className={`${styles["value-title"]}`}>Drive innovation</h3>
                  <p className={`${styles["value-description"]}`}>
                    We continuously build smarter tools and technology to solve
                    real-world communication challenges.
                  </p>
                  <div className={`${styles["value-card-metric"]}`}>
                    <span className={`${styles["metric-highlight"]}`}>&lt; 50ms Latency</span>
                    <span className={`${styles["metric-pill-dot"]}`}>
                      <span className={`${styles["metric-pulse-dot"]}`} /> Fast
                    </span>
                  </div>
                </div>

                {/* Pillar Card 3 */}
                <div className={`${styles["value-creative-card"]}`}>
                  <div className={`${styles["value-card-header"]}`}>
                    <div className={`${styles["value-icon-box"]}`}>
                      <Users size={24} />
                    </div>
                    <span className={`${styles["value-status-tag"]}`}>GLOBAL REACH</span>
                  </div>
                  <h3 className={`${styles["value-title"]}`}>Grow together</h3>
                  <p className={`${styles["value-description"]}`}>
                    We succeed when our partners succeed. Our growth is built on
                    long-term relationships.
                  </p>
                  <div className={`${styles["value-card-metric"]}`}>
                    <span className={`${styles["metric-highlight"]}`}>1,000+ Partners</span>
                    <span className={`${styles["metric-pill-dot"]}`}>
                      <span className={`${styles["metric-pulse-dot"]}`} /> Scale
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            GLOBAL IMPACT SECTION (Map as Blended Background Image)
            ======================================================== */}
        <section className={`${styles["global-impact-section"]}`} id="impact">
          <div className={`${styles["impact-layout"]}`}>
            {/* Left Visual: World Map as Background Image */}
            <div className={`${styles["impact-map-container"]}`}>
              <div className={`${styles["world-map-bg"]}`} />

              {/* Glowing Pulsing Network Nodes on the Map */}
              <div className={`${styles["map-nodes-layer"]}`}>
                {/* North America Hub */}
                <div
                  className={`${styles["network-node-dot"]}`}
                  style={{ top: '35%', left: '22%' }}
                />
                {/* South America Hub */}
                <div
                  className={`${styles["network-node-dot"]}`}
                  style={{ top: '65%', left: '33%' }}
                />
                {/* Europe Hub */}
                <div
                  className={`${styles["network-node-dot"]}`}
                  style={{ top: '31%', left: '46%' }}
                />
                {/* Asia / Japan Hub */}
                <div
                  className={`${styles["network-node-dot"]}`}
                  style={{ top: '38%', left: '78%' }}
                />
                {/* Australia Hub */}
                <div
                  className={`${styles["network-node-dot"]}`}
                  style={{ top: '75%', left: '82%' }}
                />
              </div>

              {/* Floating Badge Centered over Map */}
              <div className={`${styles["map-floating-badge"]}`} ref={mapBadgeRef}>
                <span className={`${styles["map-badge-icon"]}`}>
                  <Globe size={16} />
                </span>
                <span>Connecting 190+ countries</span>
              </div>
            </div>

            {/* Right Column Content */}
            <div className={`${styles["impact-right"]}`}>
              <div className={`${styles["badge-pill"]}`}>GLOBAL IMPACT</div>

              <h2 className={`${styles["impact-title"]}`}>
                A truly global{' '}
                <span className={`${styles["text-gradient-purple"]}`}>
                  communications network.
                </span>
              </h2>

              <p className={`${styles["impact-desc"]}`}>
                From emerging markets to global enterprises, our platform helps
                bridge distances and open new opportunities. With partners
                across 190+ countries, we&apos;re building a more connected,
                more inclusive future.
              </p>

              <div className={`${styles["impact-features-row"]}`}>
                <div className={`${styles["impact-feature-item"]}`}>
                  <span className={`${styles["impact-feature-icon"]}`}>
                    <Globe size={18} />
                  </span>
                  <span>Worldwide Coverage</span>
                </div>
                <div className={`${styles["impact-feature-item"]}`}>
                  <span className={`${styles["impact-feature-icon"]}`}>
                    <BarChart3 size={18} />
                  </span>
                  <span>Scalable Infrastructure</span>
                </div>
                <div className={`${styles["impact-feature-item"]}`}>
                  <span className={`${styles["impact-feature-icon"]}`}>
                    <Lock size={18} />
                  </span>
                  <span>Secure &amp; Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            CTA BANNER SECTION ("JOIN OUR JOURNEY")
            ======================================================== */}
        <section className={`${styles["cta-section"]}`}>
          <div className={`${styles["cta-banner-container"]}`}>
            <div className={`${styles["cta-ambient-glow"]}`} />

            {/* Decorative wavy lines SVG mesh */}
            <svg
              className={`${styles["cta-mesh-lines"]}`}
              viewBox="0 0 600 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M-50 250 C120 180, 220 280, 360 210 C460 160, 520 230, 650 180"
                stroke="rgba(192, 132, 252, 0.45)"
                strokeWidth="1.5"
              />
              <path
                d="M-50 220 C100 150, 240 260, 380 180 C480 130, 540 200, 650 150"
                stroke="rgba(168, 85, 247, 0.35)"
                strokeWidth="1.5"
              />
              <path
                d="M-50 190 C140 120, 260 230, 400 150 C500 100, 560 170, 650 120"
                stroke="rgba(147, 51, 234, 0.25)"
                strokeWidth="1.5"
              />
              <path
                d="M-50 160 C160 90, 280 200, 420 120 C520 70, 580 140, 650 90"
                stroke="rgba(99, 102, 241, 0.2)"
                strokeWidth="1.5"
              />
            </svg>

            <div className={`${styles["cta-left"]}`}>
              <div className={`${styles["cta-badge"]}`}>JOIN OUR JOURNEY</div>
              <h2 className={`${styles["cta-title"]}`}>
                Let&apos;s build a more connected tomorrow.
              </h2>
              <p className={`${styles["cta-subtitle"]}`}>
                Whether you&apos;re a business, agency or publisher, we&apos;re
                here to help you grow with the power of conversations.
              </p>
            </div>

            <div className={`${styles["cta-right"]}`}>
              <a href="/contact" className={`${styles["btn-cta-white"]}`}>
                Get Started Today <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
    </>
  );
}
