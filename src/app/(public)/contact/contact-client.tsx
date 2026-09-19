"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import {
  Send,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Mail,
  PhoneCall,
  ArrowRight,
  Play,
  MessageSquare,
} from "lucide-react";

const INQUIRY_TYPES = [
  "Agency Inbound Calls",
  "WebRTC & Custom API",
  "Carrier / Traffic Ingestion",
];

const CALL_VOLUMES = ["< 500 calls", "1,000 - 5,000", "5,000 - 20,000", "20,000+ Enterprise"];

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  agency: string;
  callVolume: string;
  inquiryType: string;
  message: string;
}

const EMPTY_FORM: ContactForm = {
  name: "",
  email: "",
  phone: "",
  agency: "",
  callVolume: "1,000 - 5,000",
  inquiryType: "Agency Inbound Calls",
  message: "",
};

export default function ContactClient() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<ContactForm>(EMPTY_FORM);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".gsap-fade-badge", { y: -15, opacity: 0, duration: 0.7, ease: "power3.out" });
      gsap.from(".gsap-fade-title", { y: 20, opacity: 0, duration: 0.8, delay: 0.1, ease: "power3.out" });
      gsap.from(".gsap-fade-left", { x: -30, opacity: 0, duration: 0.9, delay: 0.2, ease: "power3.out" });
      gsap.from(".gsap-fade-form", { x: 30, opacity: 0, duration: 0.9, delay: 0.2, ease: "power3.out" });

      gsap.to(".gsap-orb-1", { x: 30, y: -25, duration: 7, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(".gsap-orb-2", { x: -25, y: 30, duration: 8, repeat: -1, yoyo: true, ease: "sine.inOut" });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/v1/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = (await res.json()) as { success: boolean; message?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.message ?? "Submission failed — please try again");
      }
      setIsSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed — please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-[#0b0a16] border border-white/10 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all";
  const labelClass = "block text-xs font-mono uppercase text-zinc-400 mb-1.5";

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-[#06050a] text-white selection:bg-purple-500 selection:text-white font-sans antialiased overflow-x-hidden"
    >
      {/* --- AMBIENT NEON GLOWS --- */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="gsap-orb-1 absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-purple-600/20 via-violet-900/10 to-transparent blur-[160px] rounded-full" />
        <div className="gsap-orb-2 absolute top-[40%] right-[-10%] w-[550px] h-[550px] bg-purple-900/15 blur-[160px] rounded-full" />
        <div className="absolute top-[75%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/10 blur-[150px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: INBOUND COMMAND TERMINAL & DEDICATED CONTACT FORM               */}
      {/* ========================================================================= */}
      <section className="relative z-10 pt-32 md:pt-40 pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header Title */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="gsap-fade-badge inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#130f24] border border-purple-500/30 text-purple-300 text-[11px] font-semibold tracking-wider uppercase mb-4 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              DIRECT ROUTING DESK • INTAKE LIVE
            </div>

            <h1 className="gsap-fade-title text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              Get in touch with our team.
            </h1>

            <p className="text-zinc-400 text-base sm:text-lg mt-3 max-w-xl mx-auto">
              Ready to test high-intent inbound calls or connect your CRM? Fill out the dispatch form
              below and an architect will respond within minutes.
            </p>
          </div>

          {/* Main Grid: Info HUD (Left) + Prominent Contact Form (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Direct Reach & Telemetry */}
            <div className="gsap-fade-left lg:col-span-5 space-y-5">
              {/* Telemetry Status Box */}
              <div className="p-6 rounded-2xl bg-[#0e0c1b]/90 border border-purple-500/25 backdrop-blur-xl relative overflow-hidden">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.07]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                      Support Ops Online
                    </span>
                  </div>
                  <span className="text-xs font-mono text-purple-300">Mon - Fri • 8am - 8pm EST</span>
                </div>

                <div className="grid grid-cols-2 gap-4 my-5">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400">First-Response SLA</span>
                    <p className="text-2xl font-bold text-white tracking-tight mt-0.5">&lt; 14 Mins</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400">Routing Accuracy</span>
                    <p className="text-2xl font-bold text-purple-400 tracking-tight mt-0.5">99.8%</p>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed border-t border-white/[0.06] pt-4">
                  Messages bypass Tier 1 bots and route directly to senior insurance telephony specialists.
                </p>
              </div>

              {/* Direct Communication Channels */}
              <div className="space-y-3">
                <a
                  href="mailto:team@coveragecalls.com"
                  className="flex items-center justify-between p-4 rounded-xl bg-[#0c0b17] border border-white/[0.07] hover:border-purple-500/50 hover:bg-[#131024] transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-purple-950/70 border border-purple-700/40 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-zinc-400 font-mono">DIRECT INQUIRIES</div>
                      <div className="text-sm font-semibold text-white">team@coveragecalls.com</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                </a>

                <a
                  href="tel:+18884202255"
                  className="flex items-center justify-between p-4 rounded-xl bg-[#0c0b17] border border-white/[0.07] hover:border-purple-500/50 hover:bg-[#131024] transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-purple-950/70 border border-purple-700/40 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-zinc-400 font-mono">ENTERPRISE SALES LINE</div>
                      <div className="text-sm font-semibold text-white">+1 (888) 420-CALL</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                </a>

                <div className="p-4 rounded-xl bg-[#0c0b17] border border-white/[0.07] flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-purple-950/70 border border-purple-700/40 flex items-center justify-center text-purple-400">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-zinc-400 font-mono">DEDICATED SLACK CONNECT</div>
                      <div className="text-sm font-semibold text-white">Instant Shared Agency Channels</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-500/30">
                    Active
                  </span>
                </div>
              </div>

              {/* Security Pill */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#0a0814] border border-white/[0.05] text-xs text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <span>All communication is 256-bit TLS encrypted &amp; HIPAA compliant.</span>
              </div>
            </div>

            {/* Right Column: Prominent, High-Converting Contact Form */}
            <div className="gsap-fade-form lg:col-span-7">
              <div className="rounded-3xl bg-gradient-to-b from-[#15112b] via-[#0f0c1f] to-[#090814] border border-purple-500/40 p-7 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden">
                {/* Subtle internal glow accent */}
                <div
                  className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"
                  aria-hidden="true"
                />

                {/* Form Header */}
                <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/[0.08]">
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Direct Dispatch Form</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Please provide your details for prioritized queue routing.
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-purple-900/40 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>

                {/* Form Success State */}
                {isSubmitted ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-2xl font-bold text-white">Transmission Logged</h4>
                    <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                      Thank you, <strong className="text-white">{formData.name}</strong>. Your ticket has
                      been assigned to our Inbound Engineering queue. A team member will reach out via{" "}
                      <span className="text-purple-300">{formData.email}</span> shortly.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSubmitted(false);
                        setFormData(EMPTY_FORM);
                      }}
                      className="mt-4 px-5 py-2 rounded-lg bg-[#191433] hover:bg-[#221c45] border border-purple-500/30 text-xs font-mono text-purple-300 transition-colors"
                    >
                      Send Another Transmission
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Inquiry Category Pills */}
                    <div>
                      <span className="block text-xs font-mono uppercase text-zinc-400 mb-2">
                        I&apos;m Inquiring About:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Inquiry type">
                        {INQUIRY_TYPES.map((type) => (
                          <button
                            key={type}
                            type="button"
                            role="radio"
                            aria-checked={formData.inquiryType === type}
                            onClick={() => setFormData({ ...formData, inquiryType: type })}
                            className={`py-2 px-3 rounded-lg text-xs font-medium transition-all text-center border ${
                              formData.inquiryType === type
                                ? "bg-purple-600/30 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                                : "bg-[#110e22] border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/20"
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Row 1: Name & Work Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contact-name" className={labelClass}>
                          Full Name <span className="text-purple-400">*</span>
                        </label>
                        <input
                          id="contact-name"
                          required
                          type="text"
                          autoComplete="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Eleanor Vance"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-email" className={labelClass}>
                          Agency / Work Email <span className="text-purple-400">*</span>
                        </label>
                        <input
                          id="contact-email"
                          required
                          type="email"
                          autoComplete="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="e.vance@agency.com"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {/* Row 2: Phone & Agency Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contact-phone" className={labelClass}>
                          Direct Phone Number
                        </label>
                        <input
                          id="contact-phone"
                          type="tel"
                          autoComplete="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+1 (555) 019-2834"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-agency" className={labelClass}>
                          Agency Name / Brokerage
                        </label>
                        <input
                          id="contact-agency"
                          type="text"
                          autoComplete="organization"
                          value={formData.agency}
                          onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                          placeholder="Pinnacle Direct Benefits"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {/* Row 3: Monthly Call Volume Options */}
                    <div>
                      <span className="block text-xs font-mono uppercase text-zinc-400 mb-2">
                        Estimated Monthly Inbound Call Volume
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Monthly call volume">
                        {CALL_VOLUMES.map((vol) => (
                          <button
                            key={vol}
                            type="button"
                            role="radio"
                            aria-checked={formData.callVolume === vol}
                            onClick={() => setFormData({ ...formData, callVolume: vol })}
                            className={`py-2 px-2 rounded-lg text-xs font-mono transition-all text-center border ${
                              formData.callVolume === vol
                                ? "bg-purple-600/30 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                                : "bg-[#0b0a16] border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/20"
                            }`}
                          >
                            {vol}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Row 4: Message Body */}
                    <div>
                      <label htmlFor="contact-message" className={labelClass}>
                        Tell us about your campaigns or requirements{" "}
                        <span className="text-purple-400">*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        rows={3}
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Current verticals (Medicare, ACA, Final Expense), agent count, software integration goals..."
                        className={`${inputClass} resize-none`}
                      />
                    </div>

                    {submitError && (
                      <p role="alert" className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3.5 py-2.5">
                        {submitError}
                      </p>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-semibold text-sm transition-all shadow-[0_0_25px_rgba(147,51,234,0.4)] hover:shadow-[0_0_35px_rgba(147,51,234,0.6)] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Encrypting &amp; Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <span>Transmit Message to Telephony Team</span>
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: SIGNATURE HOMEPAGE PURPLE BANNER (shared SiteFooter renders below) */}
      {/* ========================================================================= */}
      <section className="relative z-10 py-16 px-6 border-t border-white/[0.06] bg-[#07060e]">
        <div className="max-w-5xl mx-auto">
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
