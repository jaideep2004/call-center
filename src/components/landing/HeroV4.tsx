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

export default function HeroV4() {
  const heroRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const cardRightRef = useRef<HTMLDivElement>(null);
  const planetRef = useRef<HTMLDivElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const [callStage, setCallStage] = useState(2); // 0: Incoming, 1: Routed, 2: Connected, 3: Completed
  const [isAgentActive, setIsAgentActive] = useState(true);

  // Simulate automated call progression loop
  useEffect(() => {
    const stageInterval = setInterval(() => {
      setCallStage((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(stageInterval);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(".nav-item-v4", { y: -15, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.04, duration: 0.7 })
        .fromTo(".hero-content-v4 > *", { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.8 }, "-=0.4")
        .fromTo(
          ".hero-card-v4",
          { scale: 0.96, opacity: 0, y: 20 },
          { scale: 1, opacity: 1, y: 0, stagger: 0.15, duration: 1 },
          "-=0.6"
        );

      gsap.to(planetRef.current, {
        y: -12,
        duration: 5,
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
        y: -6,
        duration: 3.5,
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
        ".agent-ring-v4",
        { scale: 1, opacity: 0.8 },
        { scale: 1.15, opacity: 0, duration: 1.5, repeat: 2, ease: "power2.out" }
      );
    } else {
      setIsAgentActive(false);
    }
  }, [callStage]);

  return (
    <div
      ref={heroRef}
      className="h-screen w-screen bg-[#030008] text-white overflow-hidden flex flex-col justify-between relative selection:bg-purple-500 selection:text-white"
    >
      <div ref={planetRef} className="cosmic-planet pointer-events-none" />
      <div className="absolute top-[-100px] left-[-50px] w-[400px] h-[400px] bg-purple-900/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="mountain-horizon">
        <svg viewBox="0 0 1440 220" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full opacity-95">
          <path
            fill="#030008"
            d="M0,128L48,117.3C96,107,192,85,288,96C384,107,480,149,576,149.3C672,149,768,107,864,90.7C960,75,1056,85,1152,106.7C1248,128,1344,160,1392,176L1440,192L1440,220L1392,220C1344,220,1248,220,1152,220C1056,220,960,220,864,220C768,220,672,220,576,220C480,220,384,220,288,220C192,220,96,220,48,220L0,220Z"
          ></path>
        </svg>
        <div className="absolute inset-0 bg-gradient-to-t from-[#030008] via-purple-950/10 to-transparent pointer-events-none" />
      </div>

      <header className="relative z-50 max-w-7xl w-full mx-auto px-6 pt-5">
        <nav className="glass-pill rounded-full px-6 py-3 flex items-center justify-between border border-white/10 shadow-2xl">
          <div className="flex items-center gap-2.5 nav-item-v4 cursor-pointer">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center glow-purple">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-bold tracking-wider text-xs uppercase text-white/90">COVERAGE CALLS</span>
          </div>

          <div className="hidden md:flex items-center gap-7 text-xs text-gray-300 font-medium">
            <div className="flex items-center gap-1 nav-item-v4 hover:text-white cursor-pointer transition">
              <span>Product</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="flex items-center gap-1 nav-item-v4 hover:text-white cursor-pointer transition">
              <span>Solutions</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <a href="#pricing" className="nav-item-v4 hover:text-white transition">
              Pricing
            </a>
            <div className="flex items-center gap-1 nav-item-v4 hover:text-white cursor-pointer transition">
              <span>Resources</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="flex items-center gap-1 nav-item-v4 hover:text-white cursor-pointer transition">
              <span>Company</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a href="#login" className="hidden sm:block text-xs font-medium text-gray-300 hover:text-white nav-item-v4 transition">
              Log in
            </a>
            <button className="nav-item-v4 relative group px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] text-xs font-semibold shadow-lg glow-purple hover:bg-[position:right_center] transition-all duration-500">
              <span className="flex items-center gap-1.5">
                Start free trial
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          </div>
        </nav>
      </header>

      <main className="relative z-20 max-w-7xl w-full mx-auto px-6 my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pb-8">
        <div className="hero-content-v4 lg:col-span-6 flex flex-col items-start">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill border border-purple-500/30 text-[11px] font-semibold tracking-wider text-purple-300 uppercase mb-5 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            INBOUND CALLS. REAL PEOPLE. REAL RESULTS.
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-4">
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

        <div className="hero-card-v4 lg:col-span-6 relative flex items-center justify-center lg:justify-end gap-5">
          <div className="glass-card rounded-3xl p-5 w-full max-w-[430px] relative z-20 glow-purple-lg">
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

            <div ref={waveformRef} className="h-14 flex items-center justify-center gap-[3px] px-2 my-1">
              {Array.from({ length: 38 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-[3px] rounded-full transition-colors ${
                    i > 10 && i < 28 ? "bg-gradient-to-t from-purple-600 to-purple-300" : "bg-purple-950/80"
                  }`}
                  style={{ height: `${Math.max(12, Math.sin(i * 0.4) * 35 + 20)}px` }}
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
            className={`hidden xl:flex flex-col glass-card rounded-3xl p-5 w-60 relative z-20 shadow-2xl transition-all duration-500 ${isAgentActive ? "border-purple-500/50 glow-purple" : ""}`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">YOUR AGENT</span>
              <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">ONLINE</span>
              </div>
            </div>

            <div className="flex flex-col items-center py-5 text-center">
              <div className="relative mb-3">
                <div className="agent-ring-v4 absolute -inset-1 rounded-full bg-purple-500/40 pointer-events-none" />
                <div className="w-[72px] h-[72px] rounded-full p-[2px] bg-gradient-to-tr from-purple-500 to-indigo-500 shadow-lg glow-purple relative z-10">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop"
                    alt="James Wilson"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
              <h4 className="font-bold text-sm text-white">James Wilson</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">Licensed Agent</p>
              <div className="flex items-center gap-1 mt-2.5 px-2.5 py-0.5 rounded-full glass-pill border border-white/5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-[11px] font-semibold text-gray-200">4.9</span>
              </div>
            </div>

            <button
              className={`w-full py-2.5 rounded-xl font-semibold text-xs tracking-wide shadow-lg transition-all ${
                isAgentActive
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 glow-purple text-white animate-pulse"
                  : "glass-pill text-gray-300"
              }`}
            >
              {isAgentActive ? "Connected & Live" : "Answer Call"}
            </button>
          </div>

          <svg className="absolute -left-10 top-1/2 -translate-y-1/2 w-14 h-24 hidden xl:block pointer-events-none z-10" fill="none">
            <path d="M0 12 C 25 12, 25 60, 56 60" stroke="url(#purple-gradient-v4)" strokeWidth="2" strokeDasharray="4 4" />
            <circle cx="28" cy="36" r="2.5" fill="#c084fc" className="animate-ping" />
            <defs>
              <linearGradient id="purple-gradient-v4" x1="0%" y1="0%" x2="100%" y2="100%">
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
