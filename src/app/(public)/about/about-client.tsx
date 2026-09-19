"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import {
  ShieldCheck,
  ArrowRight,
  Play,
  Cpu,
  Sparkles,
  Globe2,
  Lock,
  BarChart3,
  Volume2,
} from "lucide-react";

const WAVEFORM_BARS = [
  45, 80, 25, 95, 60, 35, 100, 75, 40, 85, 30, 90, 65, 45, 80, 100, 70, 30,
  85, 55, 95, 40, 70, 90, 50, 35,
];

const EDGE_NODES = [
  { label: "US-EAST (VA)", ping: "11ms ping", hot: false },
  { label: "US-CENTRAL (TX)", ping: "14ms ping", hot: false },
  { label: "US-WEST (CA)", ping: "18ms ping", hot: false },
  { label: "EU-WEST (LDN)", ping: "29ms ping", hot: true },
];

const ATTRIBUTION_STATS = [
  { label: "TOTAL EARNINGS", value: "$14,250.00", delta: "↑ 16.8% vs yesterday", hot: false },
  { label: "BILLABLE CALLS", value: "186", delta: "↑ 12.4% vs yesterday", hot: false },
  { label: "AVG. TALK TIME", value: "11:42", delta: "High Intent Benchmark", hot: true },
];

const TEAM = [
  {
    initials: "DK",
    node: "Austin Node",
    online: true,
    name: "Devin Kane",
    role: "CEO & Co-Founder",
    bio: "Managed $10M+ annual inbound ad spend across Medicare, ACA, and Final Expense agencies.",
    meta: "Ex-Agency Principal",
  },
  {
    initials: "SL",
    node: "SF Node",
    online: false,
    name: "Siddharth Lee",
    role: "CTO & Head of Protocols",
    bio: "Engineered distributed WebRTC video & voice infrastructure serving 30M+ peak concurrent sessions.",
    meta: "Ex-Twilio • Cloudflare",
  },
  {
    initials: "ER",
    node: "Miami Node",
    online: true,
    name: "Elena Rostova",
    role: "VP of Inbound Systems",
    bio: "Designed our patent-pending caller intent validation engines and carrier scrub trees.",
    meta: "Ex-Pinnacle Direct",
  },
  {
    initials: "MC",
    node: "NYC Node",
    online: false,
    name: "Michael Chang",
    role: "Chief Revenue Officer",
    bio: "Onboarded and structured call distribution trees for 400+ licensed insurance brokerages nationwide.",
    meta: "Ex-SecureLife Financial",
  },
];

export default function AboutClient() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeNode, setActiveNode] = useState<"edge" | "ai" | "agent">("ai");

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero Stagger In
      gsap.from(".gsap-fade-up", {
        y: 30,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out",
      });

      // Ambient Floating Glow Orbs
      gsap.to(".gsap-ambient-1", {
        x: 40,
        y: -30,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".gsap-ambient-2", {
        x: -30,
        y: 40,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // Simulated Waveform Animation
      gsap.to(".gsap-wave-bar", {
        scaleY: "random(0.2, 1)",
        duration: 0.4,
        repeat: -1,
        yoyo: true,
        stagger: {
          each: 0.04,
          from: "random",
        },
        ease: "power1.inOut",
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const nodeCard = (
    id: "edge" | "ai" | "agent",
    index: string,
    eyebrow: string,
    badge: React.ReactNode,
    title: string,
    body: string
  ) => (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={activeNode === id}
      onClick={() => setActiveNode(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setActiveNode(id);
        }
      }}
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        activeNode === id
          ? "bg-[#1f193d] border-purple-500/60 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
          : "bg-[#110f22]/70 border-white/[0.06] hover:border-white/20"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono text-purple-400 font-semibold">{index}</span>
        {badge}
      </div>
      <h4 className="text-white text-sm font-semibold">{eyebrow}</h4>
      <p className="text-xs text-zinc-400 mt-1">{body}</p>
      <p className="sr-only">{title}</p>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen bg-[#06050a] text-white selection:bg-purple-500 selection:text-white font-sans antialiased overflow-x-hidden"
    >
      {/* --- GLOW EFFECTS --- */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="gsap-ambient-1 absolute -top-40 left-1/2 -translate-x-1/2 w-[750px] h-[550px] bg-gradient-to-b from-purple-600/25 via-violet-900/10 to-transparent blur-[160px] rounded-full" />
        <div className="gsap-ambient-2 absolute top-[40%] right-[-15%] w-[600px] h-[600px] bg-purple-900/15 blur-[170px] rounded-full" />
        <div className="absolute top-[75%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/15 blur-[160px] rounded-full" />
        {/* Subtle grid mesh overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: HERO & LIVE TELEMETRY MISSION ARCHITECTURE                     */}
      {/* ========================================================================= */}
      <section className="relative z-10 pt-32 md:pt-40 pb-24 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
          {/* Badge */}
          <div className="gsap-fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#130f24] border border-purple-500/30 text-purple-300 text-[11px] font-semibold tracking-wider uppercase mb-6 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            THE INFRASTRUCTURE BEHIND QUALIFIED CONVERSATIONS
          </div>

          {/* Heading */}
          <h1 className="gsap-fade-up text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.08] mb-6">
            We built what legacy telecom refused to build.
          </h1>

          {/* Subheading */}
          <p className="gsap-fade-up text-base sm:text-lg text-zinc-400 max-w-2xl font-normal leading-relaxed mb-12">
            CoverageCalls was founded by insurance operators and distributed systems engineers
            who replaced fragile SIP softphones with zero-latency browser WebRTC and real-time AI copilot assistance.
          </p>

          {/* --- SOFTWARE CONSOLE HUD --- */}
          <div className="gsap-fade-up w-full max-w-5xl rounded-2xl bg-gradient-to-b from-[#16122c]/90 via-[#0e0c1b]/95 to-[#090812] border border-purple-500/30 p-6 md:p-8 backdrop-blur-2xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] relative overflow-hidden text-left">
            {/* Top Terminal Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5" aria-hidden="true">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-mono tracking-wider text-purple-300 font-medium pl-2 border-l border-white/10">
                  CORE TELEMETRY CLUSTER: v4.18.2
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  GLOBAL MESH: OPTIMAL
                </span>
                <span className="hidden sm:inline text-zinc-400">
                  EDGE ROUTE: <strong>&lt; 14ms</strong>
                </span>
              </div>
            </div>

            {/* Split Screen HUD: Left Pipeline Nodes / Right Active Live Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 items-center">
              {/* Left Column: Interactive Routing Architecture */}
              <div className="lg:col-span-5 space-y-3">
                <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
                  System Dataflow Architecture
                </div>

                {nodeCard(
                  "edge",
                  "01 / EDGE INGESTION",
                  "Sub-Millisecond Inbound Handshake",
                  <span className="text-[10px] text-zinc-400 font-mono">Anycast DNS</span>,
                  "Edge ingestion",
                  "Carriers ping our distributed points of presence before audio packets serialize."
                )}

                {nodeCard(
                  "ai",
                  "02 / INTENT & FRAUD SCRUB",
                  "Deep Semantic Lead Verification",
                  <span className="text-[10px] bg-purple-900/60 text-purple-200 px-2 py-0.5 rounded font-mono">
                    Live Copilot
                  </span>,
                  "Intent and fraud scrub",
                  "Pre-screens caller intent, matching Medicare/ACA state licenses automatically."
                )}

                {nodeCard(
                  "agent",
                  "03 / BROWSER WEBRTC DELIVERY",
                  "Instant Agent Browser Workspace",
                  <span className="text-[10px] text-emerald-400 font-mono">0s Install</span>,
                  "Browser WebRTC delivery",
                  "Direct OPUS audio feed with live script assistance and instant CRM sync."
                )}
              </div>

              {/* Right Column: Live In-Call Mockup HUD */}
              <div className="lg:col-span-7 bg-[#0b0916] rounded-xl border border-purple-500/20 p-5 relative overflow-hidden">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono text-zinc-300">LIVE CALL SESSION • 06:14</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-900/40 border border-purple-700/50 text-[10px] text-purple-300 font-mono">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    AI Copilot Active
                  </div>
                </div>

                {/* Prospect Details */}
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <h5 className="text-white font-semibold text-base">Eleanor Vance (Medicare)</h5>
                    <p className="text-xs text-zinc-400">Dallas, TX (75201) • Form Fill via Web Lead</p>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-950/70 border border-emerald-700/40 text-emerald-400">
                    High Intent (96%)
                  </span>
                </div>

                {/* Dynamic Waveform Visualizer */}
                <div className="my-5 p-3 rounded-lg bg-[#110d24]/80 border border-white/[0.05]">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Volume2 className="w-3 h-3 text-purple-400" /> OPUS 48kHz HD AUDIO
                    </span>
                    <span className="text-purple-400">PACKET LOSS: 0.00%</span>
                  </div>
                  <div className="flex items-end gap-1 h-9 px-1" aria-hidden="true">
                    {WAVEFORM_BARS.map((val, i) => (
                      <span
                        key={i}
                        className="gsap-wave-bar flex-1 bg-gradient-to-t from-purple-700 via-purple-500 to-indigo-400 rounded-full"
                        style={{ height: `${val}%`, transformOrigin: "bottom" }}
                      />
                    ))}
                  </div>
                </div>

                {/* Real-time Intent Notes */}
                <div className="space-y-2 text-xs bg-[#130f26]/90 p-3.5 rounded-lg border border-purple-900/30">
                  <div className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">
                    AI Real-Time Call Intelligence
                  </div>
                  <p className="text-zinc-300">
                    • Interested in $0 premium plan with comprehensive dental &amp; vision
                  </p>
                  <p className="text-zinc-300">
                    • Confirmed Primary Clinic:{" "}
                    <span className="text-purple-300 font-medium">Baylor Scott &amp; White</span>
                  </p>
                </div>

                {/* Bottom Agent Match Snapshot */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 p-[1px]">
                      <div className="w-full h-full bg-[#17122b] rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                        JW
                      </div>
                    </div>
                    <span className="text-xs text-zinc-300">James Wilson (Assigned Agent)</span>
                  </div>
                  <span className="text-xs font-mono text-purple-400">Latency: 12ms</span>
                </div>
              </div>
            </div>

            {/* Performance Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/[0.06]">
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">99.98%</p>
                <p className="text-[11px] text-zinc-400 uppercase font-mono tracking-wider mt-1">WebRTC Uptime</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">&lt; 150ms</p>
                <p className="text-[11px] text-zinc-400 uppercase font-mono tracking-wider mt-1">Voice Round-Trip</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">1.8M+</p>
                <p className="text-[11px] text-zinc-400 uppercase font-mono tracking-wider mt-1">Billable Calls Routed</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">$14.2M+</p>
                <p className="text-[11px] text-zinc-400 uppercase font-mono tracking-wider mt-1">Agency Premium Won</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: THE PARADIGM SHIFT: LEGACY VOIP VS COVERAGECALLS                */}
      {/* ========================================================================= */}
      <section className="relative z-10 py-24 px-6 border-t border-white/[0.06] bg-[#080711]/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-purple-400 font-semibold">
              ENGINEERED FOR CONVERSION
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-2 leading-tight">
              Why traditional call centers fail modern insurance agents.
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base mt-4">
              Legacy phone systems treat high-value Medicare &amp; ACA leads like basic office telephone
              calls. We redesigned the tech stack from bare metal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Legacy Approach */}
            <div className="rounded-2xl bg-[#0c0b16] border border-red-500/20 p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-red-500/5 blur-3xl pointer-events-none" aria-hidden="true" />
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/40 text-red-300 text-xs font-mono uppercase tracking-wider mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Legacy SIP Softphones &amp; Dialers
                </div>

                <h3 className="text-2xl font-bold text-white mb-4">The Costly Friction</h3>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                  Traditional aggregators drop transfers into standard desk phones or bloated softphone
                  software. Agents answer blind, talk over prospects due to 800ms SIP latency, and pay for
                  45 seconds of dead air.
                </p>

                <div className="space-y-3.5 border-t border-white/[0.06] pt-6 text-xs text-zinc-300 font-mono">
                  <div className="flex items-center justify-between p-2.5 rounded bg-red-950/20 border border-red-900/30">
                    <span className="text-zinc-400">Connection Handshake</span>
                    <span className="text-red-400">4,000ms – 8,000ms delay</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-red-950/20 border border-red-900/30">
                    <span className="text-zinc-400">Prospect Intent Data</span>
                    <span className="text-red-400">Zero context prior to greeting</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-red-950/20 border border-red-900/30">
                    <span className="text-zinc-400">Hardware Footprint</span>
                    <span className="text-red-400">Desk hardware &amp; VPN tunnels</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-red-950/20 border border-red-900/30">
                    <span className="text-zinc-400">Billing Integrity</span>
                    <span className="text-red-400">Billed for hang-ups &amp; dead air</span>
                  </div>
                </div>
              </div>
            </div>

            {/* The CoverageCalls Way */}
            <div className="rounded-2xl bg-gradient-to-b from-[#181330] via-[#110e24] to-[#0d0b1a] border border-purple-500/50 p-8 flex flex-col justify-between relative overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.18)]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 blur-3xl pointer-events-none" aria-hidden="true" />
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300 text-xs font-mono uppercase tracking-wider mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  CoverageCalls Pure WebRTC
                </div>

                <h3 className="text-2xl font-bold text-white mb-4">The High-Velocity Standard</h3>
                <p className="text-sm text-zinc-300 leading-relaxed mb-6">
                  Calls land instantly inside your browser tab with full caller qualification data already
                  rendered on your screen. You hear the caller in studio-grade 48kHz audio with zero echo
                  and zero plugins.
                </p>

                <div className="space-y-3.5 border-t border-white/[0.06] pt-6 text-xs text-zinc-200 font-mono">
                  <div className="flex items-center justify-between p-2.5 rounded bg-purple-950/40 border border-purple-700/40">
                    <span className="text-zinc-400">Connection Handshake</span>
                    <span className="text-purple-300 font-semibold">&lt; 150ms Instant Edge Bridge</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-purple-950/40 border border-purple-700/40">
                    <span className="text-zinc-400">Prospect Intent Data</span>
                    <span className="text-purple-300 font-semibold">Live Pre-Qual Answers &amp; Keyword HUD</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-purple-950/40 border border-purple-700/40">
                    <span className="text-zinc-400">Hardware Footprint</span>
                    <span className="text-purple-300 font-semibold">100% In-Browser. No VPN or Plugins</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-purple-950/40 border border-purple-700/40">
                    <span className="text-zinc-400">Billing Integrity</span>
                    <span className="text-emerald-400 font-semibold">Strict 90s+ Qualified Conversation Rule</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: SYSTEM BLUEPRINT & ARCHITECTURE (BENTO GRID)                   */}
      {/* ========================================================================= */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-purple-400 font-semibold">
                PLATFORM CAPABILITIES
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-2">
                Engineered from bare metal.
              </h2>
            </div>
            <p className="text-zinc-400 text-sm max-w-md">
              A breakdown of the proprietary routing protocols that keep agents converting at twice the
              industry average.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Bento Card 1: Edge VOIP Mesh (8 Cols) */}
            <div className="md:col-span-8 rounded-2xl bg-gradient-to-b from-[#141026] to-[#0c0b17] border border-white/[0.08] p-8 relative overflow-hidden group hover:border-purple-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-700/40 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-105 transition-transform">
                <Globe2 className="w-6 h-6" />
              </div>
              <div className="text-xs font-mono uppercase text-purple-400 mb-2 font-semibold">
                Global Telephony Spine
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Distributed Multi-Region Edge Mesh</h3>
              <p className="text-sm text-zinc-400 max-w-xl leading-relaxed mb-6">
                Our points of presence span 14 edge data centers. Audio packets never traverse the public
                internet unoptimized; they enter private fiber backbones directly at the carrier exchange.
              </p>

              {/* Visual Node Ping Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                {EDGE_NODES.map((node) => (
                  <div key={node.label} className="p-3 rounded-lg bg-[#0c0a18] border border-white/[0.06]">
                    <span className="text-zinc-500 block text-[10px]">{node.label}</span>
                    <span className={`font-bold ${node.hot ? "text-purple-400" : "text-emerald-400"}`}>
                      {node.ping}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bento Card 2: AI Intent Copilot (4 Cols) */}
            <div className="md:col-span-4 rounded-2xl bg-gradient-to-b from-[#141026] to-[#0c0b17] border border-white/[0.08] p-8 relative overflow-hidden group hover:border-purple-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-700/40 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-105 transition-transform">
                  <Cpu className="w-6 h-6" />
                </div>
                <div className="text-xs font-mono uppercase text-purple-400 mb-2 font-semibold">
                  Sub-Second Processing
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Live Speech Copilot</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Transcribes dialogue at the edge to recommend rebuttals, highlight carrier health
                  networks, and auto-populate CRM fields.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0d0b1a] border border-purple-900/30 text-[11px] font-mono text-zinc-300">
                <span className="text-purple-400 font-bold">&gt; Objection Detected:</span>
                <p className="text-zinc-400 mt-1">
                  &quot;Is my doctor covered under this network?&quot; — Cued Baylor Scott database.
                </p>
              </div>
            </div>

            {/* Bento Card 3: Security & Cryptographic Compliance (4 Cols) */}
            <div className="md:col-span-4 rounded-2xl bg-gradient-to-b from-[#141026] to-[#0c0b17] border border-white/[0.08] p-8 relative overflow-hidden group hover:border-purple-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-700/40 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-105 transition-transform">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="text-xs font-mono uppercase text-purple-400 mb-2 font-semibold">
                  Total Security
                </div>
                <h3 className="text-xl font-bold text-white mb-2">HIPAA &amp; TCPA Vault</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Every call generates an immutable cryptographic proof token capturing caller consent
                  time, IP, and campaign disclosure logs.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-900/40">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>256-Bit TLS &amp; SRTP Encrypted</span>
              </div>
            </div>

            {/* Bento Card 4: Agency Revenue Attribution Engine (8 Cols) */}
            <div className="md:col-span-8 rounded-2xl bg-gradient-to-b from-[#141026] to-[#0c0b17] border border-white/[0.08] p-8 relative overflow-hidden group hover:border-purple-500/40 transition-all">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-700/40 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded bg-[#1b1535] border border-purple-500/30 text-purple-300">
                    Auto-Updating Metrics
                  </span>
                </div>
              </div>

              <div className="text-xs font-mono uppercase text-purple-400 mb-2 font-semibold">
                Real-Time Revenue Telemetry
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Down-to-the-Dollar Call Attribution</h3>
              <p className="text-sm text-zinc-400 max-w-xl leading-relaxed mb-6">
                Know precisely which campaigns, ad creatives, and search keywords drive converted policies.
                Reallocate budget mid-day to top-performing sources.
              </p>

              {/* Mini Attribution Visual Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                {ATTRIBUTION_STATS.map((stat) => (
                  <div key={stat.label} className="p-3 rounded-lg bg-[#0c0a18] border border-white/[0.06]">
                    <span className="text-zinc-500 block text-[10px]">{stat.label}</span>
                    <span className="text-white text-base font-bold">{stat.value}</span>
                    <span
                      className={`text-[10px] block mt-0.5 ${
                        stat.hot ? "text-purple-300" : "text-emerald-400"
                      }`}
                    >
                      {stat.delta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: LEADERSHIP + HOMEPAGE SIGNATURE GRADIENT CTA                   */}
      {/* ========================================================================= */}
      <section className="relative z-10 py-24 px-6 border-t border-white/[0.06] bg-[#07060e]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-purple-400 font-semibold">
              THE OPERATORS
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-2">
              Built by agency veterans.
            </h2>
            <p className="text-zinc-400 text-sm mt-3">
              We spent years on the phones before writing a single line of CoverageCalls code.
            </p>
          </div>

          {/* Leaders styled as Agent Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
            {TEAM.map((member) => (
              <div
                key={member.name}
                className="p-5 rounded-2xl bg-[#0e0c1b] border border-purple-500/20 hover:border-purple-500/50 transition-all relative overflow-hidden group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 p-[1.5px]">
                    <div className="w-full h-full bg-[#151126] rounded-full flex items-center justify-center font-bold text-white text-sm">
                      {member.initials}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      member.online
                        ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/40"
                        : "bg-purple-950/80 text-purple-300 border-purple-800/40"
                    }`}
                  >
                    {member.node}
                  </span>
                </div>
                <h4 className="text-white font-bold text-base">{member.name}</h4>
                <p className="text-xs text-purple-400 mb-2">{member.role}</p>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">{member.bio}</p>
                <div className="text-[10px] font-mono text-zinc-500">{member.meta}</div>
              </div>
            ))}
          </div>

          {/* --- HOMEPAGE SIGNATURE PURPLE CTA --- */}
          <div className="rounded-3xl bg-gradient-to-r from-[#4c1d95] via-[#6d28d9] to-[#4338ca] p-8 sm:p-14 border border-purple-400/30 shadow-[0_0_80px_rgba(109,40,217,0.35)] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div
              className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            <div className="max-w-xl text-center md:text-left">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
                Ready to start taking better calls?
              </h2>
              <p className="text-purple-100 text-sm sm:text-base opacity-90">
                Join hundreds of agents and agencies growing their business with Coverage Calls.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white text-purple-950 font-semibold text-sm hover:bg-zinc-100 transition-all shadow-lg text-center flex items-center justify-center gap-2 group"
              >
                Start 7-day free trial
                <ArrowRight className="w-4 h-4 text-purple-900 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/#how-it-works"
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Watch demo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
