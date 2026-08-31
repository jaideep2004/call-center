"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  ChevronDown,
  Mic,
  MicOff,
  Pause,
  LayoutGrid,
  PhoneOff,
  Star,
  Check,
  ArrowRight,
  Play,
  Activity,
} from "lucide-react";
import "./FinalHero.css";

export default function FinalHero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const cardRightRef = useRef<HTMLDivElement>(null);
  const planetRef = useRef<HTMLDivElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const [callStage, setCallStage] = useState(2);
  const [isAgentActive, setIsAgentActive] = useState(true);

  useEffect(() => {
    const stageInterval = setInterval(() => {
      setCallStage((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(stageInterval);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(".nav-item-v5", { y: -15, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.04, duration: 0.7 })
        .fromTo(".hero-content-v5 > *", { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.8 }, "-=0.4")
        .fromTo(
          ".hero-card-v5",
          { scale: 0.96, opacity: 0, y: 20 },
          { scale: 1, opacity: 1, y: 0, stagger: 0.15, duration: 1 },
          "-=0.6"
        );

      gsap.to(planetRef.current, {
        y: -14,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      if (waveformRef.current) {
        const bars = waveformRef.current.children;
        Array.from(bars).forEach((bar, i) => {
          gsap.to(bar, {
            scaleY: Math.random() * 1.6 + 0.3,
            duration: 0.35 + (i % 3) * 0.15,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: i * 0.02,
          });
        });
      }

      gsap.to(cardRightRef.current, {
        y: -8,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (callStage === 2) {
      setIsAgentActive(true);
      gsap.fromTo(
        ".agent-ring-v5",
        { scale: 1, opacity: 0.8 },
        { scale: 1.2, opacity: 0, duration: 1.5, repeat: 2, ease: "power2.out" }
      );
    } else {
      setIsAgentActive(false);
    }
  }, [callStage]);

  return (
    <div
      ref={heroRef}
      className="final-hero-root h-screen w-screen bg-[#030008] text-white overflow-hidden flex flex-col justify-between relative selection:bg-purple-500 selection:text-white"
    >
      <div className="planet-glow-v5 pointer-events-none" />
      <div ref={planetRef} className="cosmic-planet-v5 pointer-events-none" />
      <div className="absolute top-[-100px] left-[-60px] w-[450px] h-[450px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="mountain-landscape-v5">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full">
          <defs>
            <linearGradient id="mountain-gradient-v5" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2d1b4e" stopOpacity="0.98" />
              <stop offset="38%" stopColor="#1e1040" stopOpacity="0.96" />
              <stop offset="72%" stopColor="#0f0a1e" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#030008" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="mountain-highlight-v5" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6d28d9" stopOpacity="0.0" />
              <stop offset="28%" stopColor="#7c3aed" stopOpacity="0.35" />
              <stop offset="52%" stopColor="#a78bfa" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.0" />
            </linearGradient>
            <filter id="mountain-3d-v5" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="10" />
              <feOffset dx="0" dy="10" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.28" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Back ridge — deeper shadow for 3D depth (from 2nd hero) */}
          <path
            d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            fill="#080512"
            opacity="0.95"
          />
          {/* Main jagged range — taken from 2nd hero with 3D filter */}
          <path
            d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            fill="url(#mountain-gradient-v5)"
            filter="url(#mountain-3d-v5)"
          />
          {/* Second layer — secondary ridge for depth */}
          <path
            d="M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,208C1248,192,1344,192,1392,192L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            fill="#0a0618"
            opacity="0.72"
          />
          {/* Ridge highlight — subtle 3D light edge */}
          <path
            d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128"
            fill="none"
            stroke="url(#mountain-highlight-v5)"
            strokeWidth="1.6"
            opacity="0.65"
          />
        </svg>
        <div className="mountain-mist-v5" />
      </div>

      <header className="relative z-50 max-w-[1300px] w-full mx-auto px-6 pt-5">
        <nav className="glass-pill rounded-full px-6 py-3.5 flex items-center justify-between border border-white/10 shadow-2xl">
          <div className="flex items-center gap-2.5 nav-item-v5 cursor-pointer">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center glow-purple">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-bold tracking-wider text-xs uppercase text-white/90">COVERAGE CALLS</span>
          </div>

          <div className="hidden md:flex items-center gap-7 text-xs text-gray-300 font-medium">
            <div className="flex items-center gap-1 nav-item-v5 hover:text-white cursor-pointer transition">
              <span>Product</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="flex items-center gap-1 nav-item-v5 hover:text-white cursor-pointer transition">
              <span>Solutions</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <a href="#pricing" className="nav-item-v5 hover:text-white transition">
              Pricing
            </a>
            <div className="flex items-center gap-1 nav-item-v5 hover:text-white cursor-pointer transition">
              <span>Resources</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="flex items-center gap-1 nav-item-v5 hover:text-white cursor-pointer transition">
              <span>Company</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a href="#login" className="hidden sm:block text-xs font-medium text-gray-300 hover:text-white nav-item-v5 transition">
              Log in
            </a>
            <button className="nav-item-v5 relative group px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] text-xs font-semibold shadow-lg glow-purple hover:bg-[position:right_center] transition-all duration-500">
              <span className="flex items-center gap-1.5">
                Start free trial
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          </div>
        </nav>
      </header>

      <main className="relative z-20 max-w-[1300px] w-full mx-auto px-6 my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pb-8">
        <div className="hero-content-v5 lg:col-span-6 flex flex-col items-start">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill border border-purple-500/30 text-[11px] font-semibold tracking-wider text-purple-300 uppercase mb-5 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            INBOUND CALLS. REAL PEOPLE. REAL RESULTS.
          </div>

          <h1 className="text-[4rem] font-extrabold tracking-tight leading-[1.05] mb-4">
            Every qualified call. <br />
            <span className="text-gradient">Exactly where</span> <br />
            it belongs.
          </h1>

          <p className="text-gray-400 text-sm sm:text-base font-normal leading-relaxed max-w-lg mb-7">
            Coverage Calls delivers verified inbound calls to your team in real time. Answer in your browser. Close more deals.
            Scale with confidence.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mb-7">
            <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-semibold text-sm shadow-xl glow-purple flex items-center justify-center gap-2.5 group transition-all">
              <span>Start 7-day free trial</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-6 py-3 rounded-xl glass-pill hover:bg-white/10 font-semibold text-sm flex items-center justify-center gap-2.5 border border-white/10 transition-all group">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-3 h-3 fill-white text-white ml-0.5" />
              </div>
              <span>Watch demo</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-400 font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span>Setup in minutes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>

        <div className="hero-card-v5 lg:col-span-6 relative flex items-center justify-center lg:justify-end gap-6">
          <div className="glass-card-v5 rounded-3xl p-6 w-full max-w-[430px] relative z-20 glow-purple-lg min-h-[420px] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 relative" />
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400">LIVE CALL</span>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs font-mono text-gray-300">04:32</span>
              </div>
              <div className="w-7 h-7 rounded-full glass-pill flex items-center justify-center text-gray-300">
                <Activity className="w-3.5 h-3.5 text-purple-400" />
              </div>
            </div>

            <div className="flex items-center gap-3.5 py-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-900 to-indigo-900 border border-purple-500/40 flex items-center justify-center text-white font-bold shadow-inner">
                <svg className="w-6 h-6 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Medicare Prospect</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Dallas, TX · Via Web Lead</p>
              </div>
            </div>

            <div
              ref={waveformRef}
              className="h-16 flex items-center justify-center gap-[3px] px-2 my-2 flex-1"
              suppressHydrationWarning
            >
              {Array.from({ length: 38 }).map((_, i) => (
                <div
                  key={i}
                  suppressHydrationWarning
                  className={`w-[3px] rounded-full transition-colors ${
                    i > 10 && i < 28 ? "bg-gradient-to-t from-purple-600 to-purple-300" : "bg-purple-950/80"
                  }`}
                  style={{ height: `${Math.max(12, Math.sin(i * 0.4) * 35 + 20).toFixed(1)}px` }}
                />
              ))}
            </div>

            <div className="pt-4 pb-3">
              <div className="relative flex items-center justify-between px-2">
                <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[2px] bg-purple-950 z-0" />
                <div
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-[2px] bg-purple-500 z-0 transition-all duration-500 shadow-[0_0_10px_#a855f7]"
                  style={{ width: `${(callStage / 3) * 85}%` }}
                />

                {["Incoming", "Routed", "Connected", "Completed"].map((label, idx) => {
                  const isPassed = callStage >= idx;
                  const isCurrent = callStage === idx;
                  return (
                    <div key={label} className="relative z-10 flex flex-col items-center">
                      <div
                        className={`rounded-full transition-all duration-300 ${
                          isCurrent
                            ? "w-3.5 h-3.5 bg-purple-400 ring-4 ring-purple-500/30 shadow-[0_0_12px_#c084fc]"
                            : isPassed
                              ? "w-3 h-3 bg-purple-500 shadow-[0_0_8px_#a855f7]"
                              : "w-3 h-3 bg-purple-950 border border-purple-800"
                        }`}
                      />
                      <span className={`text-[10px] mt-1.5 font-medium ${isCurrent ? "text-white font-semibold" : "text-gray-400"}`}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-4 border-t border-white/10 mt-1">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`flex flex-col items-center justify-center py-2 rounded-xl transition ${
                  isMuted
                    ? "bg-purple-600/30 border border-purple-500/50 text-purple-300"
                    : "glass-pill hover:bg-white/10 text-gray-300 hover:text-white"
                }`}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5 mb-1 text-purple-400" /> : <Mic className="w-3.5 h-3.5 mb-1 text-gray-400" />}
                <span className="text-[10px] font-medium">{isMuted ? "Unmute" : "Mute"}</span>
              </button>

              <button
                onClick={() => setIsHeld(!isHeld)}
                className={`flex flex-col items-center justify-center py-2 rounded-xl transition ${
                  isHeld
                    ? "bg-purple-600/30 border border-purple-500/50 text-purple-300"
                    : "glass-pill hover:bg-white/10 text-gray-300 hover:text-white"
                }`}
              >
                <Pause className="w-3.5 h-3.5 mb-1 text-gray-400" />
                <span className="text-[10px] font-medium">{isHeld ? "Resume" : "Hold"}</span>
              </button>

              <button className="flex flex-col items-center justify-center py-2 rounded-xl glass-pill hover:bg-white/10 text-gray-300 hover:text-white transition">
                <LayoutGrid className="w-3.5 h-3.5 mb-1 text-gray-400" />
                <span className="text-[10px] font-medium">Keypad</span>
              </button>

              <button className="flex flex-col items-center justify-center py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 transition">
                <PhoneOff className="w-3.5 h-3.5 mb-1" />
                <span className="text-[10px] font-medium">End Call</span>
              </button>
            </div>
          </div>

          <div
            ref={cardRightRef}
            className={`hidden xl:flex flex-col glass-card-v5 rounded-3xl p-6 w-64 relative z-20 shadow-2xl transition-all duration-500 min-h-[420px] ${isAgentActive ? "border-purple-500/60" : ""}`}
            style={isAgentActive ? { boxShadow: "0 0 35px rgba(168,85,247,0.45)" } : undefined}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
              <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">YOUR AGENT</span>
              <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">ONLINE</span>
              </div>
            </div>

            <div className="flex flex-col items-center py-6 text-center flex-1 justify-center">
              <div className="relative mb-3.5">
                <div className="agent-ring-v5 absolute -inset-1.5 rounded-full bg-purple-500/40 pointer-events-none" />
                <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-purple-500 to-indigo-500 shadow-lg glow-purple relative z-10">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop"
                    alt="James Wilson"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
              <h4 className="font-bold text-base text-white">James Wilson</h4>
              <p className="text-xs text-gray-400 mt-0.5">Licensed Agent</p>
              <div className="flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full glass-pill border border-white/5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-semibold text-gray-200">4.9</span>
              </div>
            </div>

            <button
              className={`w-full py-3 rounded-xl font-semibold text-xs tracking-wide shadow-lg transition-all ${
                isAgentActive
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 glow-purple text-white"
                  : "glass-pill text-gray-300"
              }`}
            >
              {isAgentActive ? "Connected & Live" : "Answer Call"}
            </button>
          </div>

          <svg className="absolute left-[23rem] top-1/2 -translate-y-1/2 w-16 h-28 hidden xl:block pointer-events-none z-10" fill="none">
            <path d="M0 14 C 30 14, 30 70, 64 70" stroke="url(#purple-gradient-v5)" strokeWidth="2" strokeDasharray="6 6" />
            <circle r="3" fill="#e9d5ff" className="filter drop-shadow-[0_0_8px_#c084fc]">
              <animateMotion path="M0 14 C 30 14, 30 70, 64 70" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <defs>
              <linearGradient id="purple-gradient-v5" x1="0%" y1="0%" x2="100%" y2="100%">
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
