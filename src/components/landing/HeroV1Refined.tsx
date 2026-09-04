"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import {
  ChevronDown,
  Mic,
  Pause,
  LayoutGrid,
  PhoneOff,
  Star,
  Check,
  ArrowRight,
  Play,
  Activity,
} from "lucide-react";

export default function HeroV1() {
  const heroRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const cardRightRef = useRef<HTMLDivElement>(null);
  const planetRef = useRef<HTMLDivElement>(null);

  // Refs for animation targets
  const step1Ref = useRef<HTMLDivElement>(null); // Incoming
  const step2Ref = useRef<HTMLDivElement>(null); // Routed
  const step3Ref = useRef<HTMLDivElement>(null); // Connected
  const step4Ref = useRef<HTMLDivElement>(null); // Completed
  const lineRef = useRef<HTMLDivElement>(null); // Progress line
  const answerBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // --- 1. ENTRANCE ANIMATION ---
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".nav-item", { y: -20, opacity: 0, duration: 0.8, stagger: 0.05 })
        .from(".hero-content > *", { y: 30, opacity: 0, duration: 1, stagger: 0.1 }, "-=0.6")
        .from(".hero-card", { scale: 0.9, opacity: 0, y: 50, duration: 1.2, ease: "back.out(1.7)" }, "-=0.8");

      // --- 2. AMBIENT FLOATING ---
      gsap.to(planetRef.current, { y: -20, duration: 8, repeat: -1, yoyo: true, ease: "sine.inOut" });

      // Floating Agent Card
      gsap.to(cardRightRef.current, { y: -10, duration: 5, repeat: -1, yoyo: true, ease: "sine.inOut" });

      // --- 3. WAVEFORM ANIMATION ---
      if (waveformRef.current) {
        const bars = waveformRef.current.children;
        Array.from(bars).forEach((bar, i) => {
          gsap.to(bar, {
            scaleY: Math.random() * 2 + 0.5,
            duration: 0.3 + Math.random() * 0.2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: i * 0.02,
          });
        });
      }

      // --- 4. CALL FLOW LOOP ANIMATION ---
      const callLoop = gsap.timeline({ repeat: -1, repeatDelay: 2 });

      callLoop.set([step1Ref.current, step2Ref.current, step3Ref.current, step4Ref.current], {
        backgroundColor: "rgba(168, 85, 247, 0.1)",
        boxShadow: "none",
        scale: 1,
      });
      callLoop.set(step1Ref.current, { backgroundColor: "#a855f7", boxShadow: "0 0 15px #a855f7", scale: 1.2 });
      callLoop.set(lineRef.current, { width: "0%" });

      callLoop
        .to(step1Ref.current, { backgroundColor: "rgba(168, 85, 247, 0.1)", scale: 1, duration: 0.5 }, "+=1.5")
        .to(step2Ref.current, { backgroundColor: "#a855f7", boxShadow: "0 0 15px #a855f7", scale: 1.2, duration: 0.3 })
        .to(lineRef.current, { width: "33%", duration: 0.5 }, "<");

      callLoop
        .to(step2Ref.current, { backgroundColor: "rgba(168, 85, 247, 0.1)", scale: 1, duration: 0.5 }, "+=1.5")
        .to(step3Ref.current, { backgroundColor: "#c084fc", boxShadow: "0 0 25px #c084fc", scale: 1.4, duration: 0.4 })
        .to(lineRef.current, { width: "66%", duration: 0.5 }, "<");

      callLoop.to(
        cardRightRef.current,
        {
          scale: 1.05,
          borderColor: "rgba(168, 85, 247, 0.8)",
          boxShadow: "0 0 40px rgba(168, 85, 247, 0.4)",
          duration: 0.4,
        },
        "<"
      );

      callLoop.fromTo(
        answerBtnRef.current,
        { scale: 1, backgroundColor: "#7c3aed" },
        { scale: 1.05, backgroundColor: "#a855f7", duration: 0.4, repeat: 3, yoyo: true },
        "<"
      );

      callLoop
        .to(step3Ref.current, { backgroundColor: "rgba(168, 85, 247, 0.1)", scale: 1, duration: 0.5 }, "+=2")
        .to(step4Ref.current, { backgroundColor: "#a855f7", boxShadow: "0 0 15px #a855f7", scale: 1.2, duration: 0.3 })
        .to(lineRef.current, { width: "100%", duration: 0.5 }, "<")
        .to(
          cardRightRef.current,
          { scale: 1, borderColor: "rgba(168, 85, 247, 0.2)", boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)", duration: 0.5 },
          "<"
        )
        .to(answerBtnRef.current, { scale: 1, backgroundColor: "#7c3aed", duration: 0.5 }, "<");
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={heroRef} className="relative w-full h-screen bg-[#030008] text-white overflow-hidden flex flex-col">
      {/* --- BACKGROUND LAYERS --- */}
      <div ref={planetRef} className="planet-bg" />
      <div className="ambient-glow" />

      {/* Mountain Landscape SVG */}
      <div className="mountain-landscape">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
          <defs>
            <linearGradient id="mountain-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#030008" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path
            d="M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,208C1248,192,1344,192,1392,192L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            fillOpacity="0.6"
            fill="url(#mountain-gradient)"
          ></path>
        </svg>
      </div>

      {/* --- NAVBAR --- */}
      <header className="relative z-50 w-full px-6 pt-6 flex justify-center">
        <nav className="glass-pill rounded-full px-6 py-3.5 flex items-center justify-between w-full max-w-6xl border border-white/10 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center gap-3 nav-item cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center glow-purple">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-bold tracking-wider text-xs sm:text-sm uppercase text-white/90 hidden sm:block">
              COVERAGE CALLS
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-xs sm:text-sm text-gray-300 font-medium">
            {["Product", "Solutions", "Pricing", "Resources", "Company"].map((item) => (
              <div key={item} className="flex items-center gap-1 nav-item hover:text-white cursor-pointer transition">
                <span>{item}</span>
                {item !== "Pricing" && <ChevronDown className="w-3 h-3 text-gray-500" />}
              </div>
            ))}
          </div>

          {/* Auth & CTA */}
          <div className="flex items-center gap-4 sm:gap-6">
            <a
              href="#login"
              className="hidden sm:block text-xs sm:text-sm font-medium text-gray-300 hover:text-white nav-item transition"
            >
              Log in
            </a>
            <button className="nav-item relative group px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] text-xs sm:text-sm font-semibold shadow-lg glow-purple hover:bg-[position:right_center] transition-all duration-500">
              <span className="flex items-center gap-2">
                Start free trial
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          </div>
        </nav>
      </header>

      {/* --- HERO CONTENT GRID --- */}
      <main className="relative z-20 flex-1 max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pb-12 lg:pb-0">
        {/* LEFT COLUMN: Copy */}
        <div className="hero-content lg:col-span-5 xl:col-span-5 flex flex-col items-start justify-center pt-4 lg:pt-0">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-pill border border-purple-500/30 text-[10px] sm:text-xs font-bold tracking-wider text-purple-200 uppercase mb-6 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            INBOUND CALLS. REAL PEOPLE. REAL RESULTS.
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Every qualified call. <br />
            <span className="text-gradient">Exactly where</span> <br />
            it belongs.
          </h1>

          {/* Subtitle */}
          <p className="text-gray-400 text-sm sm:text-base lg:text-lg font-normal leading-relaxed max-w-lg mb-8">
            Coverage Calls delivers verified inbound calls to your team in real time. Answer in your browser. Close more
            deals. Scale with confidence.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-8">
            <button className="px-6 sm:px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-semibold text-sm sm:text-base shadow-2xl glow-purple flex items-center justify-center gap-2 group transition-all">
              <span>Start 7-day free trial</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-6 sm:px-8 py-3.5 rounded-xl glass-pill hover:bg-white/10 font-semibold text-sm sm:text-base flex items-center justify-center gap-2 border border-white/10 transition-all group">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-3 h-3 fill-white text-white ml-0.5" />
              </div>
              <span>Watch demo</span>
            </button>
          </div>

          {/* Trust Checkmarks */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] sm:text-xs text-gray-400 font-medium">
            {["No credit card required", "Setup in minutes", "Cancel anytime"].map((text) => (
              <div key={text} className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400">
                  <Check className="w-2 h-2 stroke-[3]" />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Cards */}
        <div className="hero-card lg:col-span-7 xl:col-span-7 relative flex items-center justify-center lg:justify-end pt-8 lg:pt-0 h-full">
          {/* MAIN CALL WIDGET CARD */}
          <div className="glass-card rounded-3xl p-5 sm:p-6 w-full max-w-[440px] relative z-20 glow-purple-lg border border-purple-500/20">
            {/* Top Bar inside card */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 relative" />
                <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400">LIVE CALL</span>
                <span className="text-[10px] text-gray-500">·</span>
                <span className="text-[10px] font-mono text-gray-300">04:32</span>
              </div>
              <div className="w-7 h-7 rounded-full glass-pill flex items-center justify-center text-gray-300 cursor-pointer hover:text-white hover:bg-white/10 transition">
                <Activity className="w-3.5 h-3.5 text-purple-400" />
              </div>
            </div>

            {/* Caller Info */}
            <div className="flex items-center gap-4 py-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-purple-900 to-indigo-900 border border-purple-500/40 flex items-center justify-center text-white text-xl font-bold shadow-inner">
                <svg
                  className="w-6 h-6 sm:w-7 sm:h-7 text-purple-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Medicare Prospect</h3>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Dallas, TX · Via Web Lead</p>
              </div>
            </div>

            {/* Audio Waveform */}
            <div ref={waveformRef} className="h-14 sm:h-16 flex items-center justify-center gap-[2px] px-4 my-2">
              {Array.from({ length: 36 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-[2px] sm:w-[3px] rounded-full ${
                    i > 10 && i < 26 ? "bg-gradient-to-t from-purple-600 to-purple-300" : "bg-purple-900/60"
                  }`}
                  style={{ height: `${Math.max(10, Math.sin(i * 0.4) * 30 + 15)}px` }}
                />
              ))}
            </div>

            {/* Call Stage Timeline */}
            <div className="pt-6 pb-4">
              <div className="relative flex items-center justify-between px-2">
                <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-[2px] bg-purple-950/80 z-0 rounded-full" />
                <div
                  ref={lineRef}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-[2px] bg-purple-500 z-0 shadow-[0_0_10px_#a855f7] rounded-full"
                />

                <div className="relative z-10 flex flex-col items-center">
                  <div
                    ref={step1Ref}
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-purple-500/20 border border-purple-500/50 transition-all duration-300"
                  />
                  <span className="text-[9px] sm:text-[10px] text-gray-500 mt-2 font-medium">Incoming</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    ref={step2Ref}
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-purple-500/20 border border-purple-500/50 transition-all duration-300"
                  />
                  <span className="text-[9px] sm:text-[10px] text-gray-500 mt-2 font-medium">Routed</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    ref={step3Ref}
                    className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-purple-500/20 border border-purple-500/50 transition-all duration-300"
                  />
                  <span className="text-[9px] sm:text-[10px] text-gray-500 mt-2 font-medium">Connected</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    ref={step4Ref}
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-purple-500/20 border border-purple-500/50 transition-all duration-300"
                  />
                  <span className="text-[9px] sm:text-[10px] text-gray-500 mt-2 font-medium">Completed</span>
                </div>
              </div>
            </div>

            {/* Call Control Buttons */}
            <div className="grid grid-cols-4 gap-2 pt-5 border-t border-white/10 mt-2">
              {[
                { icon: Mic, label: "Mute" },
                { icon: Pause, label: "Hold" },
                { icon: LayoutGrid, label: "Keypad" },
                { icon: PhoneOff, label: "End Call", color: "text-red-400 bg-red-600/10 border-red-500/30 hover:bg-red-600/20" },
              ].map((btn, idx) => (
                <button
                  key={idx}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-xl glass-pill hover:bg-white/10 text-gray-300 hover:text-white transition group ${btn.color || ""}`}
                >
                  <btn.icon className={`w-4 h-4 mb-1 ${btn.color ? "text-red-400" : "text-gray-400 group-hover:text-white"}`} />
                  <span className="text-[9px] font-medium">{btn.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AGENT CARD (Floating on Right) */}
          <div
            ref={cardRightRef}
            className="hidden xl:flex flex-col glass-card rounded-3xl p-5 w-64 absolute right-[-20px] lg:right-[-40px] xl:right-0 z-30 shadow-2xl border border-purple-500/20 transition-all duration-500"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">YOUR AGENT</span>
              <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">ONLINE</span>
              </div>
            </div>

            {/* Agent Photo & Details */}
            <div className="flex flex-col items-center py-5 text-center">
              <div className="relative mb-3">
                <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-purple-500 to-indigo-500 shadow-lg glow-purple">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop"
                    alt="James Wilson"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
              <h4 className="font-bold text-sm text-white">James Wilson</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">Licensed Agent</p>

              <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full glass-pill border border-white/5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-[10px] font-semibold text-gray-200">4.9</span>
              </div>
            </div>

            <button
              ref={answerBtnRef}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-semibold text-xs tracking-wide shadow-lg glow-purple transition-all"
            >
              Answer Call
            </button>
          </div>

          {/* Connecting Laser Line SVG */}
          <svg
            className="absolute left-1/2 top-1/2 -translate-x-[110%] -translate-y-1/2 w-24 h-24 hidden xl:block pointer-events-none z-10"
            fill="none"
          >
            <path
              d="M10 50 C 50 50, 50 10, 90 10"
              stroke="url(#purple-gradient)"
              strokeWidth="2"
              strokeDasharray="4 4"
              className="opacity-60"
            />
            <circle cx="50" cy="30" r="3" fill="#c084fc" className="animate-ping" />
            <defs>
              <linearGradient id="purple-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9333ea" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </main>
    </div>
  );
}
