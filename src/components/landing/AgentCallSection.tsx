"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import styles from "./AgentCallSection.module.css";

const TABS: Array<"call" | "leads" | "analytics" | "security"> = [
  "call",
  "leads",
  "analytics",
  "security",
];

const initialWaveHeights = [
  12, 16, 22, 18, 28, 38, 52, 44, 60, 72, 85, 68, 92, 100, 88, 76,
  95, 110, 96, 78, 90, 105, 85, 70, 92, 108, 95, 74, 88, 98, 80, 65,
  82, 94, 76, 60, 72, 80, 62, 48, 55, 42, 32, 24, 18, 14, 10
];

const transcriptLines = [
  { speaker: "Prospect", text: "I'm looking for a plan that covers dental and $0 co-pays." },
  { speaker: "AI Copilot", text: "Match found: Humana Gold Plus (HMO) fits Dallas ZIP 75201." },
  { speaker: "Agent", text: "Great! Let's check if your primary clinic is in-network." },
  { speaker: "Prospect", text: "Yes please, that would be Baylor Scott & White." },
];

export default function AgentCallSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const waveBarsRef = useRef<(HTMLDivElement | null)[]>([]);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [activeTab, setActiveTab] = useState<"call" | "leads" | "analytics" | "security">("call");
  const [isPaused, setIsPaused] = useState(false);
  const [callTime, setCallTime] = useState(272);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [selectedDisposition, setSelectedDisposition] = useState("Appointment Set");
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [transcriptIndex, setTranscriptIndex] = useState(0);

  useEffect(() => {
    if (isPaused) return;

    const cycleInterval = setInterval(() => {
      setActiveTab((prevTab) => {
        const nextIdx = (TABS.indexOf(prevTab) + 1) % TABS.length;
        return TABS[nextIdx];
      });
    }, 4500);

    return () => clearInterval(cycleInterval);
  }, [isPaused]);

  useEffect(() => {
    if (isOnHold) return;
    const timer = setInterval(() => {
      setCallTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOnHold]);

  useEffect(() => {
    const transcriptInterval = setInterval(() => {
      setTranscriptIndex((prev) => (prev + 1) % transcriptLines.length);
    }, 3600);
    return () => clearInterval(transcriptInterval);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".anim-left-target", {
        opacity: 0,
        y: 24,
        duration: 0.85,
        stagger: 0.1,
        ease: "power3.out",
      });

      if (mockupRef.current) {
        gsap.from(mockupRef.current, {
          opacity: 0,
          scale: 0.96,
          y: 30,
          duration: 1,
          ease: "power3.out",
          delay: 0.15,
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (activeTab !== "call") return;

    const tweens: gsap.core.Tween[] = [];
    waveBarsRef.current.forEach((bar, index) => {
      if (!bar) return;
      const tween = gsap.to(bar, {
        scaleY: isOnHold ? 0.15 : "random(0.3, 1.4)",
        duration: isOnHold ? 0.8 : "random(0.25, 0.65)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: (index % 8) * 0.04,
      });
      tweens.push(tween);
    });

    return () => {
      tweens.forEach((t) => t.kill());
    };
  }, [isOnHold, activeTab]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mockupRef.current) return;
    const rect = mockupRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    gsap.to(mockupRef.current, {
      rotateY: x * 0.02,
      rotateX: -y * 0.02,
      transformPerspective: 1000,
      ease: "power1.out",
      duration: 0.4,
      overwrite: "auto",
    });
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    if (!mockupRef.current) return;
    gsap.to(mockupRef.current, {
      rotateY: 0,
      rotateX: 0,
      ease: "power2.out",
      duration: 0.6,
      overwrite: "auto",
    });
  };

  const handleSaveDisposition = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowToast(true);

      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setShowToast(false);
      }, 3500);
    }, 700);
  };

  const selectTab = useCallback((tab: "call" | "leads" | "analytics" | "security") => {
    setActiveTab(tab);
  }, []);

  return (
    <section id="agent-calls" className={styles.section} ref={containerRef}>
      <div className={styles.ambientGlowTopRight} />
      <div className={styles.ambientGlowBottomLeft} />

      <div
        className={`${styles.toast} ${showToast ? styles.toastVisible : ""}`}
        role="status"
        aria-live="polite"
      >
        <div className={styles.toastIcon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <p className={styles.toastTitle}>Call Disposed &amp; Logged!</p>
          <p className={styles.toastDesc}>Synced to CRM • Recording &amp; Transcript Uploaded</p>
        </div>
      </div>

      <div className={styles.wrapper}>
        <div className={styles.leftColumn}>
          <div className={`${styles.eyebrow} anim-left-target`}>BUILT FOR AGENTS</div>

          <h1 className={`${styles.headline} anim-left-target`}>
            Calls land right<br />
            in <span className={styles.gradientText}>your browser</span>
          </h1>

          <p className={`${styles.subheadline} anim-left-target`}>
            No downloads. No desk phones. Just open<br />
            Coverage Calls and start taking inbound calls.
          </p>

          <ul className={`${styles.featureList} anim-left-target`}>
            <li>
              <span className={styles.checkIcon}>
                <svg viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill="#8B5CF6" />
                  <path d="M5 8.2L7.1 10.3L11.5 5.8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Real-time caller info &amp; intent
            </li>
            <li>
              <span className={styles.checkIcon}>
                <svg viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill="#8B5CF6" />
                  <path d="M5 8.2L7.1 10.3L11.5 5.8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Live call recording &amp; transcriptions
            </li>
            <li>
              <span className={styles.checkIcon}>
                <svg viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill="#8B5CF6" />
                  <path d="M5 8.2L7.1 10.3L11.5 5.8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Script &amp; campaign context
            </li>
            <li>
              <span className={styles.checkIcon}>
                <svg viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill="#8B5CF6" />
                  <path d="M5 8.2L7.1 10.3L11.5 5.8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              One-click disposition
            </li>
          </ul>

          <div className="anim-left-target">
            <button className={styles.viewDashboardBtn} type="button">
              <span>View full dashboard</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>

        <div
          className={styles.mockupContainer}
          ref={mockupRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={handleMouseLeave}
        >
          <div className={styles.floatingTagTop}>
            <span className={styles.pingSparkle}>✨</span> AI Copilot Active
          </div>

          <div className={styles.mockupWindow}>
            <div className={styles.windowHeader}>
              <div className={styles.windowDots}>
                <span className={styles.dotRed} />
                <span className={styles.dotYellow} />
                <span className={styles.dotGreen} />
              </div>
              <div className={styles.appTab}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d8b4fe" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <span>Coverage Calls • Agent Workspace</span>
              </div>
              <div className={styles.networkStatus}>
                <span className={styles.networkDot} />
                <span>Ultra-low Latency (14ms)</span>
              </div>
            </div>

            <div className={styles.windowBody}>
              <aside className={styles.innerSidebar}>
                <button
                  type="button"
                  onClick={() => selectTab("call")}
                  title="Live Call View"
                  className={`${styles.sideIconBtn} ${activeTab === "call" ? styles.sideIconActive : ""}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {activeTab === "call" && !isPaused && <span className={styles.tabProgressBorder} />}
                </button>

                <button
                  type="button"
                  onClick={() => selectTab("leads")}
                  title="Lead Profile & CRM"
                  className={`${styles.sideIconBtn} ${activeTab === "leads" ? styles.sideIconActive : ""}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {activeTab === "leads" && !isPaused && <span className={styles.tabProgressBorder} />}
                </button>

                <button
                  type="button"
                  onClick={() => selectTab("analytics")}
                  title="Real-time Metrics"
                  className={`${styles.sideIconBtn} ${activeTab === "analytics" ? styles.sideIconActive : ""}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                  {activeTab === "analytics" && !isPaused && <span className={styles.tabProgressBorder} />}
                </button>

                <button
                  type="button"
                  onClick={() => selectTab("security")}
                  title="HIPAA & Compliance"
                  className={`${styles.sideIconBtn} ${activeTab === "security" ? styles.sideIconActive : ""}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  {activeTab === "security" && !isPaused && <span className={styles.tabProgressBorder} />}
                </button>
              </aside>

              <div className={styles.mainCallArea}>
                {activeTab === "call" && (
                  <div className={styles.viewContentFade}>
                    <div className={styles.liveCallHeader}>
                      <div className={styles.liveIndicator}>
                        <span className={`${styles.pulseDot} ${isOnHold ? styles.holdPulse : ""}`} />
                        <span className={isOnHold ? styles.holdText : styles.liveText}>
                          {isOnHold ? "CALL ON HOLD" : "LIVE CALL"}
                        </span>
                      </div>
                      <span className={styles.dotDivider}>•</span>
                      <span className={styles.callTimer}>{formatTime(callTime)}</span>
                      <div className={styles.sentimentBadge}>
                        <span className={styles.sentimentEmoji}>🔥</span>
                        <span>High Intent (94%)</span>
                      </div>
                    </div>

                    <div className={styles.callerProfile}>
                      <div className={styles.avatar}>
                        <div className={styles.avatarGlow} />
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e9d5ff" strokeWidth="1.8">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <div className={styles.callerDetails}>
                        <div className={styles.nameRow}>
                          <h3>Eleanor Vance (Medicare)</h3>
                          <span className={styles.verifiedBadge}>Verified Inbound</span>
                        </div>
                        <p>Dallas, TX (75201) • Form Fill via Web Lead</p>
                      </div>
                    </div>

                    <div className={styles.tagsRow}>
                      <span className={styles.tag}>Medicare Advantage</span>
                      <span className={styles.tag}>Plan Switch</span>
                      <span className={`${styles.tag} ${styles.tagHighlight}`}>Dental &amp; Vision Required</span>
                    </div>

                    <div className={`${styles.waveformContainer} ${isOnHold ? styles.waveMuted : ""}`}>
                      {initialWaveHeights.map((h, i) => (
                        <div
                          key={i}
                          ref={(el) => {
                            waveBarsRef.current[i] = el;
                          }}
                          className={styles.waveBar}
                          style={{ height: h + "%" }}
                        />
                      ))}
                    </div>

                    <div className={styles.liveTranscriptBox}>
                      <div className={styles.transcriptHeader}>
                        <span className={styles.transcriptSpeaker}>
                          {transcriptLines[transcriptIndex].speaker}:
                        </span>
                        <span className={styles.liveTranscriptionTag}>Live Subtitle</span>
                      </div>
                      <p className={styles.transcriptText}>
                        &ldquo;{transcriptLines[transcriptIndex].text}&rdquo;
                        <span className={styles.typingBlinker}>|</span>
                      </p>
                    </div>

                    <div className={styles.callControlsRow}>
                      <button
                        type="button"
                        onClick={() => setIsMuted(!isMuted)}
                        className={`${styles.controlBtn} ${isMuted ? styles.controlBtnActiveRed : ""}`}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="23" />
                          <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                        <span>{isMuted ? "Unmute" : "Mute"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsOnHold(!isOnHold)}
                        className={`${styles.controlBtn} ${isOnHold ? styles.controlBtnActiveOrange : ""}`}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="6" y="4" width="4" height="16" />
                          <rect x="14" y="4" width="4" height="16" />
                        </svg>
                        <span>{isOnHold ? "Resume" : "Hold"}</span>
                      </button>

                      <button type="button" className={styles.controlBtn}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="6" cy="6" r="1.5" fill="currentColor" />
                          <circle cx="12" cy="6" r="1.5" fill="currentColor" />
                          <circle cx="18" cy="6" r="1.5" fill="currentColor" />
                          <circle cx="6" cy="12" r="1.5" fill="currentColor" />
                          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                          <circle cx="18" cy="12" r="1.5" fill="currentColor" />
                        </svg>
                        <span>Keypad</span>
                      </button>

                      <button type="button" className={styles.endCallBtn}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                          <line x1="23" y1="1" x2="1" y2="23" />
                        </svg>
                        <span>End Call</span>
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "leads" && (
                  <div className={`${styles.tabContentPanel} ${styles.viewContentFade}`}>
                    <div className={styles.tabHeader}>
                      <h4>Caller CRM Profile</h4>
                      <span className={styles.tabSubtag}>Lead ID: #TX-9042</span>
                    </div>
                    <div className={styles.crmRow}>
                      <span className={styles.crmLabel}>Full Name:</span>
                      <span className={styles.crmVal}>Eleanor Vance</span>
                    </div>
                    <div className={styles.crmRow}>
                      <span className={styles.crmLabel}>DOB / Age:</span>
                      <span className={styles.crmVal}>11/04/1956 (67 yrs)</span>
                    </div>
                    <div className={styles.crmRow}>
                      <span className={styles.crmLabel}>Current Carrier:</span>
                      <span className={styles.crmVal}>UnitedHealthcare HMO</span>
                    </div>
                    <div className={styles.crmRow}>
                      <span className={styles.crmLabel}>Prescriptions:</span>
                      <span className={styles.crmVal}>Atorvastatin, Lisinopril</span>
                    </div>
                    <div className={styles.crmRow}>
                      <span className={styles.crmLabel}>Lead Source:</span>
                      <span className={styles.crmVal}>Google Search (Inbound PPC)</span>
                    </div>
                  </div>
                )}

                {activeTab === "analytics" && (
                  <div className={`${styles.tabContentPanel} ${styles.viewContentFade}`}>
                    <div className={styles.tabHeader}>
                      <h4>Real-Time Quality &amp; Analytics</h4>
                      <span className={styles.tabSubtag}>Active Stream</span>
                    </div>
                    <div className={styles.metricsGrid}>
                      <div className={styles.metricCard}>
                        <span className={styles.metricTitle}>Audio Clarity</span>
                        <span className={styles.metricNumber}>99.8%</span>
                      </div>
                      <div className={styles.metricCard}>
                        <span className={styles.metricTitle}>Talk/Listen Ratio</span>
                        <span className={styles.metricNumber}>42% / 58%</span>
                      </div>
                      <div className={styles.metricCard}>
                        <span className={styles.metricTitle}>Script Adherence</span>
                        <span className={styles.metricNumber}>96%</span>
                      </div>
                      <div className={styles.metricCard}>
                        <span className={styles.metricTitle}>Sentiment Velocity</span>
                        <span className={styles.metricNumber}>+14.2%</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "security" && (
                  <div className={`${styles.tabContentPanel} ${styles.viewContentFade}`}>
                    <div className={styles.tabHeader}>
                      <h4>HIPAA &amp; Security Compliance</h4>
                      <span className={styles.verifiedBadge}>TLS 1.3 Encrypted</span>
                    </div>
                    <div className={styles.securityItem}>
                      <span className={styles.shieldCheck}>✓</span>
                      <span>Real-time Voice PII Redaction Active</span>
                    </div>
                    <div className={styles.securityItem}>
                      <span className={styles.shieldCheck}>✓</span>
                      <span>End-to-End SOC2 Type II Certified Pipeline</span>
                    </div>
                    <div className={styles.securityItem}>
                      <span className={styles.shieldCheck}>✓</span>
                      <span>Audio Stored in HIPAA Compliant US-East Vault</span>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.rightInfoPanel}>
                <div className={styles.notesSection}>
                  <div className={styles.notesTitleRow}>
                    <label className={styles.sectionLabel}>AI Live Call Notes</label>
                    <span className={styles.autoSyncBadge}>Auto-transcribing</span>
                  </div>
                  <div className={styles.notesBox}>
                    <ul>
                      <li>Interested in $0 premium plan</li>
                      <li>Looking for comprehensive dental</li>
                      <li>Prefers morning doctor visits</li>
                      <li className={styles.newNoteHighlight}>
                        Primary Clinic: Baylor Scott &amp; White
                      </li>
                    </ul>
                  </div>
                </div>

                <div className={styles.dispositionSection}>
                  <label className={styles.sectionLabel} htmlFor="disposition-select">
                    Disposition &amp; Outcome
                  </label>
                  <div className={styles.selectWrapper}>
                    <select
                      id="disposition-select"
                      value={selectedDisposition}
                      onChange={(e) => setSelectedDisposition(e.target.value)}
                      className={styles.customSelect}
                    >
                      <option value="Appointment Set">Appointment Set</option>
                      <option value="Follow Up Required">Follow Up Required</option>
                      <option value="Policy Enrolled">Policy Enrolled</option>
                      <option value="Not Interested">Not Interested</option>
                    </select>
                    <svg className={styles.selectChevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                <button
                  type="button"
                  className={`${styles.saveCompleteBtn} ${isSaving ? styles.btnLoading : ""}`}
                  onClick={handleSaveDisposition}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <span className={styles.spinner} />
                  ) : (
                    <>
                      <span>Save &amp; Complete</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
