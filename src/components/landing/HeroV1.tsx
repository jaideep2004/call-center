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

export default function HeroV1Original() {
  const heroRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const cardRightRef = useRef<HTMLDivElement>(null);
  const planetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        ".nav-item-orig",
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.05, duration: 0.8 }
      )
        .fromTo(
          ".hero-content-orig > *",
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.15, duration: 1 },
          "-=0.4"
        )
        .fromTo(
          ".hero-card-orig",
          { scale: 0.95, opacity: 0, y: 30 },
          { scale: 1, opacity: 1, y: 0, stagger: 0.2, duration: 1.2 },
          "-=0.8"
        );

      gsap.to(planetRef.current, {
        y: -15,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      if (waveformRef.current) {
        const bars = waveformRef.current.children;
        Array.from(bars).forEach((bar, i) => {
          gsap.to(bar, {
            scaleY: Math.random() * 1.5 + 0.4,
            duration: 0.4 + (i % 3) * 0.2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: i * 0.03,
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

  return (
    <div
      ref={heroRef}
      className="relative min-h-screen bg-[#030008] text-white selection:bg-purple-500 selection:text-white overflow-hidden pb-20"
    >
      <div ref={planetRef} className="cosmic-bg pointer-events-none" />
      <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="mountain-silhouette" />

      <header className="relative z-50 max-w-7xl mx-auto px-6 pt-6">
        <nav className="glass-pill rounded-full px-6 py-4 flex items-center justify-between border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3 nav-item-orig cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center glow-purple">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-bold tracking-wider text-sm uppercase text-white/90">COVERAGE CALLS</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-gray-300 font-medium">
            <div className="flex items-center gap-1.5 nav-item-orig hover:text-white cursor-pointer transition">
              <span>Product</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-center gap-1.5 nav-item-orig hover:text-white cursor-pointer transition">
              <span>Solutions</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            <a href="#pricing" className="nav-item-orig hover:text-white transition">
              Pricing
            </a>
            <div className="flex items-center gap-1.5 nav-item-orig hover:text-white cursor-pointer transition">
              <span>Resources</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-center gap-1.5 nav-item-orig hover:text-white cursor-pointer transition">
              <span>Company</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <a href="#login" className="hidden sm:block text-sm font-medium text-gray-300 hover:text-white nav-item-orig transition">
              Log in
            </a>
            <button className="nav-item-orig relative group px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] text-sm font-semibold shadow-lg glow-purple hover:bg-[position:right_center] transition-all duration-500">
              <span className="flex items-center gap-2">
                Start free trial
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          </div>
        </nav>
      </header>

      <main className="relative z-20 max-w-7xl mx-auto px-6 pt-20 lg:pt-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="hero-content-orig lg:col-span-6 flex flex-col items-start">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill border border-purple-500/30 text-xs font-semibold tracking-wider text-purple-300 uppercase mb-8 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            INBOUND CALLS. REAL PEOPLE. REAL RESULTS.
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6">
            Every qualified call. <br />
            <span className="text-gradient">Exactly where</span> <br />
            it belongs.
          </h1>

          <p className="text-gray-400 text-lg sm:text-xl font-normal leading-relaxed max-w-xl mb-10">
            Coverage Calls delivers verified inbound calls to your team in real time. Answer in your browser. Close more deals. Scale
            with confidence.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-10">
            <button className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-semibold text-base shadow-2xl glow-purple flex items-center justify-center gap-3 group transition-all">
              <span>Start 7-day free trial</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 py-4 rounded-2xl glass-pill hover:bg-white/10 font-semibold text-base flex items-center justify-center gap-3 border border-white/10 transition-all group">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
              </div>
              <span>Watch demo</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs sm:text-sm text-gray-400 font-medium">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span>Setup in minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>

        <div className="hero-card-orig lg:col-span-6 relative flex items-center justify-center lg:justify-end gap-6 pt-10 lg:pt-0">
          <div className="glass-card rounded-3xl p-6 w-full max-w-[460px] relative z-20 glow-purple-lg">
            <div className="flex items-center justify-between pb-5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative" />
                <span className="text-xs font-bold tracking-wider uppercase text-emerald-400">LIVE CALL</span>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs font-mono text-gray-300">04:32</span>
              </div>
              <div className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-gray-300 cursor-pointer hover:text-white">
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
            </div>

            <div className="flex items-center gap-4 py-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-900 to-indigo-900 border border-purple-500/40 flex items-center justify-center text-white text-xl font-bold shadow-inner">
                <svg className="w-7 h-7 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Medicare Prospect</h3>
                <p className="text-xs text-gray-400 mt-0.5">Dallas, TX · Via Web Lead</p>
              </div>
            </div>

            <div ref={waveformRef} className="h-16 flex items-center justify-center gap-[3px] px-4 my-2">
              {Array.from({ length: 42 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-[3px] rounded-full ${
                    i > 12 && i < 30 ? "bg-gradient-to-t from-purple-600 to-purple-300" : "bg-purple-900/60"
                  }`}
                  style={{ height: `${Math.max(15, Math.sin(i * 0.4) * 40 + 25)}px` }}
                />
              ))}
            </div>

            <div className="pt-6 pb-4">
              <div className="relative flex items-center justify-between px-2">
                <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[2px] bg-purple-950 z-0" />
                <div className="absolute left-4 w-3/4 top-1/2 -translate-y-1/2 h-[2px] bg-purple-500 z-0 shadow-[0_0_10px_#a855f7]" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_#a855f7]" />
                  <span className="text-[11px] text-gray-400 mt-2 font-medium">Incoming</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_#a855f7]" />
                  <span className="text-[11px] text-gray-400 mt-2 font-medium">Routed</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-purple-400 ring-4 ring-purple-500/30 shadow-[0_0_15px_#c084fc]" />
                  <span className="text-[11px] text-white mt-2 font-semibold">Connected</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-950 border border-purple-800" />
                  <span className="text-[11px] text-gray-500 mt-2 font-medium">Completed</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-6 border-t border-white/10 mt-2">
              <button className="flex flex-col items-center justify-center py-2.5 rounded-xl glass-pill hover:bg-white/10 text-gray-300 hover:text-white transition">
                <Mic className="w-4 h-4 mb-1 text-gray-400" />
                <span className="text-[10px] font-medium">Mute</span>
              </button>
              <button className="flex flex-col items-center justify-center py-2.5 rounded-xl glass-pill hover:bg-white/10 text-gray-300 hover:text-white transition">
                <Pause className="w-4 h-4 mb-1 text-gray-400" />
                <span className="text-[10px] font-medium">Hold</span>
              </button>
              <button className="flex flex-col items-center justify-center py-2.5 rounded-xl glass-pill hover:bg-white/10 text-gray-300 hover:text-white transition">
                <LayoutGrid className="w-4 h-4 mb-1 text-gray-400" />
                <span className="text-[10px] font-medium">Keypad</span>
              </button>
              <button className="flex flex-col items-center justify-center py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 transition">
                <PhoneOff className="w-4 h-4 mb-1" />
                <span className="text-[10px] font-medium">End Call</span>
              </button>
            </div>
          </div>

          <div ref={cardRightRef} className="hidden xl:flex flex-col glass-card rounded-3xl p-5 w-64 relative z-20 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">YOUR AGENT</span>
              <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">ONLINE</span>
              </div>
            </div>

            <div className="flex flex-col items-center py-6 text-center">
              <div className="relative mb-3">
                <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-purple-500 to-indigo-500 shadow-lg glow-purple">
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

            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-semibold text-xs tracking-wide shadow-lg glow-purple transition-all">
              Answer Call
            </button>
          </div>

          <svg className="absolute -left-12 top-1/2 -translate-y-1/2 w-16 h-24 hidden xl:block pointer-events-none z-10" fill="none">
            <path d="M0 12 C 30 12, 30 60, 64 60" stroke="url(#purple-gradient-orig)" strokeWidth="2" strokeDasharray="4 4" />
            <circle cx="32" cy="36" r="3" fill="#c084fc" className="animate-ping" />
            <defs>
              <linearGradient id="purple-gradient-orig" x1="0%" y1="0%" x2="100%" y2="100%">
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
