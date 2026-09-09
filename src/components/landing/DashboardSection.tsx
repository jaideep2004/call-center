'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import styles from './DashboardSection.module.css';

const statsData = [
  { label: 'Total Earnings', value: '$14,250.00', change: '+16.8%', isLive: true },
  { label: 'Billable Calls', value: '186', change: '+12.4%', isLive: false },
  { label: 'Answered Calls', value: '212', change: '+9.7%', isLive: false },
  { label: 'Avg. Talk Time', value: '11:42', change: '+6.1%', isLive: false },
];

const campaignsData = [
  { name: 'Medicare Advantage', value: '$4,250', color: '#3b82f6', iconType: 'medicare' },
  { name: 'ACA Health', value: '$4,150', color: '#06b6d4', iconType: 'aca' },
  { name: 'Final Expense', value: '$2,840', color: '#0ea5e9', iconType: 'expense' },
  { name: 'Life Insurance', value: '$1,010', color: '#ec4899', iconType: 'life' },
];

export default function DashboardSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const leftContentRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  // Continuous Chart Refs
  const chartSvgRef = useRef<SVGSVGElement>(null);
  const chartPath1Ref = useRef<SVGPathElement>(null);
  const chartPath2Ref = useRef<SVGPathElement>(null);
  const chartPath3Ref = useRef<SVGPathElement>(null);
  const scanLineRef = useRef<HTMLDivElement>(null);
  const glowOrbLeftRef = useRef<HTMLDivElement>(null);
  const glowOrbRightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* ================= 1. INITIAL ENTRANCE ================= */
      gsap.from(leftContentRef.current?.children || [], {
        opacity: 0,
        y: 28,
        duration: 0.9,
        stagger: 0.1,
        ease: 'power3.out',
      });

      gsap.from(`.${styles.statCard}, .${styles.chartCard}, .${styles.campaignsCard}`, {
        opacity: 0,
        y: 35,
        scale: 0.98,
        duration: 1,
        stagger: 0.08,
        ease: 'power3.out',
        delay: 0.15,
      });

      // Initial Chart SVG Draw + Continuous Loop (lines redraw forever)
      const paths = [chartPath1Ref.current, chartPath2Ref.current, chartPath3Ref.current];
      paths.forEach((path, i) => {
        if (path) {
          const length = path.getTotalLength();
          gsap.set(path, { strokeDasharray: length, strokeDashoffset: length, opacity: 1 });
          // Entrance draw
          gsap.to(path, {
            strokeDashoffset: 0,
            duration: 1.6 + i * 0.2,
            ease: 'power2.out',
            delay: 0.3 + i * 0.1,
            onComplete: () => {
              // Continuous loop: erase → redraw → hold → repeat (true infinite line animation)
              const loopTl = gsap.timeline({ repeat: -1, repeatDelay: 0.9, delay: 0.6 });
              loopTl
                .to(path, {
                  strokeDashoffset: length,
                  duration: 0.9,
                  ease: 'power2.in',
                })
                .to(path, {
                  strokeDashoffset: 0,
                  duration: 1.4,
                  ease: 'power2.out',
                });
            },
          });
        }
      });

      /* ================= 2. CONTINUOUS ANIMATIONS ================= */

      // 0. Ensure chart SVG stays visible (no container breathe — lines animate themselves)
      if (chartSvgRef.current) {
        gsap.set(chartSvgRef.current, { opacity: 1, visibility: 'visible', clearProps: 'transform' });
      }

      // A. Subtle continuous drift on lines — now COMBINED with the stroke loop above, so lines are always moving
      if (chartPath1Ref.current) {
        gsap.to(chartPath1Ref.current, {
          y: -3,
          duration: 1.7,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 1.8,
        });
      }

      if (chartPath2Ref.current) {
        gsap.to(chartPath2Ref.current, {
          y: 3,
          duration: 2.0,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 2.1,
        });
      }

      if (chartPath3Ref.current) {
        gsap.to(chartPath3Ref.current, {
          y: -2.5,
          duration: 1.9,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 1.9,
        });
      }

      // B. Continuous Horizontal Radar Scanner on Chart
      if (scanLineRef.current) {
        gsap.to(scanLineRef.current, {
          left: '100%',
          duration: 3.6,
          repeat: -1,
          ease: 'power1.inOut',
          yoyo: true,
        });
      }

      // C. Sequential Campaign Row Live Pulse Highlighter
      const campaignRows = gsap.utils.toArray<HTMLElement>(`.${styles.campaignRow}`);
      if (campaignRows.length > 0) {
        const campaignTl = gsap.timeline({ repeat: -1, delay: 1 });
        campaignRows.forEach((row) => {
          campaignTl
            .to(row, {
              backgroundColor: 'rgba(168, 85, 247, 0.09)',
              borderColor: 'rgba(168, 85, 247, 0.25)',
              x: 4,
              duration: 0.8,
              ease: 'power2.out',
            })
            .to(row, {
              backgroundColor: 'rgba(255, 255, 255, 0.015)',
              borderColor: 'rgba(255, 255, 255, 0.04)',
              x: 0,
              duration: 1.2,
              ease: 'power2.inOut',
            }, '+=0.6');
        });
      }

      // D. Continuous Ambient Background Light Drift
      if (glowOrbLeftRef.current) {
        gsap.to(glowOrbLeftRef.current, {
          x: 40,
          y: 30,
          scale: 1.15,
          duration: 7,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      if (glowOrbRightRef.current) {
        gsap.to(glowOrbRightRef.current, {
          x: -30,
          y: -40,
          scale: 1.1,
          duration: 8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="dashboard-preview" className={styles.section} ref={sectionRef}>
      {/* Background Floating Ambient Glows */}
      <div className={styles.ambientGlowLeft} ref={glowOrbLeftRef} />
      <div className={styles.ambientGlowRight} ref={glowOrbRightRef} />

      <div className={styles.container}>
        {/* Left Column: Hero Content */}
        <div className={styles.leftCol} ref={leftContentRef}>
          <div className={styles.badge}>BUILT FOR VISIBILITY</div>
          <h2 className={styles.title}>
            Track every call. <br />
            Every dollar.
          </h2>
          <p className={styles.description}>
            Know what&apos;s happening across your team and campaigns in real time.
          </p>

          <ul className={styles.featureList}>
            <li>
              <span className={styles.checkIcon}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span>Live call & agent activity</span>
            </li>
            <li>
              <span className={styles.checkIcon}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span>Earnings, billable calls & commissions</span>
            </li>
            <li>
              <span className={styles.checkIcon}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span>Call outcomes & quality scores</span>
            </li>
            <li>
              <span className={styles.checkIcon}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span>Drill-down by campaign, agent, or date</span>
            </li>
          </ul>

          <button className={styles.ctaButton}>
            <span>Start full dashboard</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        {/* Right Column: Dashboard UI */}
        <div className={styles.rightCol} ref={cardsRef}>
          {/* Top Metric Cards */}
          <div className={styles.metricsGrid}>
            {statsData.map((stat, index) => (
              <div key={index} className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statLabel}>{stat.label}</span>
                  {stat.isLive && (
                    <span className={styles.liveIndicator}>
                      <span className={styles.livePing} />
                      <span className={styles.liveDot} />
                    </span>
                  )}
                </div>
                <span className={styles.statValue}>{stat.value}</span>
                <div className={styles.statChange}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                  <span>{stat.change}</span>
                  <span className={styles.vsText}>vs yesterday</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Grid: Chart & Top Campaigns */}
          <div className={styles.bottomGrid}>
            {/* Call Activity Chart */}
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <div className={styles.chartTitleBox}>
                  <span className={styles.chartTitle}>Call Activity</span>
                  <span className={styles.realtimeTag}>LIVE FEED</span>
                </div>
                <div className={styles.chartLegend}>
                  <span className={styles.legendItem}>
                    <span className={`${styles.dot} ${styles.purpleDot}`} /> Answered
                  </span>
                  <span className={styles.legendItem}>
                    <span className={`${styles.dot} ${styles.blueDot}`} /> Billable
                  </span>
                  <span className={styles.legendItem}>
                    <span className={`${styles.dot} ${styles.pinkDot}`} /> Revenue
                  </span>
                </div>
              </div>

              <div className={styles.chartContainer}>
                {/* Y-Axis labels */}
                <div className={styles.yAxis}>
                  <span>80</span>
                  <span>60</span>
                  <span>40</span>
                  <span>20</span>
                  <span>0</span>
                </div>

                {/* SVG Graph + Dynamic Scanner */}
                <div className={styles.svgWrapper}>
                  {/* Radar Vertical Scan Beam */}
                  <div className={styles.scanLine} ref={scanLineRef} />

                  <svg ref={chartSvgRef} viewBox="0 0 500 160" preserveAspectRatio="none" className={styles.chartSvg}>
                    {/* Grid lines */}
                    <line x1="0" y1="5" x2="500" y2="5" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="42" x2="500" y2="42" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="118" x2="500" y2="118" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="155" x2="500" y2="155" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

                    {/* Chart Paths */}
                    {/* Blue line: Billable */}
                    <path
                      ref={chartPath1Ref}
                      d="M 10 150 L 35 125 L 60 120 L 85 135 L 110 100 L 140 122 L 165 105 L 195 120 L 220 85 L 250 115 L 280 65 L 310 105 L 335 75 L 365 110 L 400 45 L 430 70 L 470 95"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />

                    {/* Purple line: Answered */}
                    <path
                      ref={chartPath2Ref}
                      d="M 10 152 L 35 138 L 65 130 L 90 142 L 115 115 L 145 130 L 170 122 L 200 135 L 225 105 L 255 125 L 285 85 L 315 118 L 340 92 L 370 120 L 405 60 L 435 85 L 470 110"
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="2"
                      strokeOpacity="0.85"
                      strokeLinecap="round"
                    />

                    {/* Pink/Red line: Revenue */}
                    <path
                      ref={chartPath3Ref}
                      d="M 10 155 L 35 132 L 60 148 L 90 140 L 120 150 L 150 118 L 180 118 L 210 138 L 240 125 L 270 108 L 300 115 L 330 145 L 360 110 L 390 132 L 420 102 L 450 130 L 470 118"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    {/* Continuous Pulsing Beacon at Tip of Blue Path */}
                    <circle cx="470" cy="95" r="4" fill="#3b82f6" className={styles.beaconDot} />
                    <circle cx="470" cy="95" r="9" fill="none" stroke="#3b82f6" strokeWidth="1.5" className={styles.beaconRing} />
                  </svg>
                </div>
              </div>

              {/* X-Axis labels */}
              <div className={styles.xAxis}>
                <span>12 AM</span>
                <span>4 AM</span>
                <span>8 AM</span>
                <span>12 PM</span>
                <span>4 PM</span>
                <span>8 PM</span>
                <span>12 AM</span>
              </div>
            </div>

            {/* Top Campaigns Card */}
            <div className={styles.campaignsCard}>
              <div className={styles.campaignsHeader}>
                <span className={styles.campaignsTitle}>Top Campaigns</span>
                <span className={styles.activeTag}>AUTO UPDATING</span>
              </div>
              <div className={styles.campaignList}>
                {campaignsData.map((item, index) => (
                  <div key={index} className={styles.campaignRow}>
                    <div className={styles.campaignLeft}>
                      <div
                        className={styles.campaignIconBox}
                        style={{ backgroundColor: `${item.color}18`, borderColor: `${item.color}40` }}
                      >
                        {item.iconType === 'medicare' && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
                          </svg>
                        )}
                        {item.iconType === 'aca' && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2.2"/>
                            <path d="M7 17V7M12 17V7M17 17V7"/>
                          </svg>
                        )}
                        {item.iconType === 'expense' && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                          </svg>
                        )}
                        {item.iconType === 'life' && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                          </svg>
                        )}
                      </div>
                      <span className={styles.campaignName}>{item.name}</span>
                    </div>
                    <span className={styles.campaignValue}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
