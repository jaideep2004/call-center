"use client";

import Link from "next/link";
import { useRef } from "react";
import { Waveform } from "./Waveform";
import { gsap, ScrollTrigger, useIsomorphicLayoutEffect, prefersReducedMotion, isSmallViewport } from "@/lib/animations";

const checklist = [
  "Real-time caller info & intent",
  "Live call recording & transcriptions",
  "Script & campaign context",
  "One-click disposition",
];

const notes = [
  "Interested in $0 premium plan",
  "Looking for dental coverage",
  "Prefers morning appointments",
];

export function BrowserProduct() {
  const root = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const reduced = prefersReducedMotion();
      const small = isSmallViewport();
      if (reduced) return;

      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
        defaults: { ease: "power3.out" },
      });

      // 12.2 text reveal
      tl.from(".bp-eyebrow", { y: 12, opacity: 0, duration: 0.5 })
        .from(".bp-heading", { y: 35, opacity: 0, duration: 0.8 }, "-=0.2")
        .from(".bp-heading em", { opacity: 0.4, duration: 1.0, ease: "sine.out" }, "-=0.5")
        .from(".bp-body", { y: 18, opacity: 0, duration: 0.7 }, "-=0.4")
        .from(".bp-list li", { y: 10, opacity: 0, stagger: 0.08, duration: 0.5 }, "-=0.3")
        .from(".bp-link", { y: 10, opacity: 0, duration: 0.5 }, "-=0.2");

      // 12.3 browser window entrance (settles onto the page)
      tl.from(
        ".bp-browser",
        { y: 32, scale: 0.94, rotateX: small ? 0 : 5, opacity: 0, duration: 1.15 },
        "-=0.6"
      );

      // 12.4 UI micro-motion
      tl.from(".bp-callnotes li", { y: 8, opacity: 0, stagger: 0.1, duration: 0.5 }, "-=0.7");
      if (!small) {
        tl.to(".bp-browser .waveform-sweep", { xPercent: 220, duration: 2.4, ease: "sine.inOut", repeat: -1, yoyo: true }, "+=0.3");
      }

      // Disposition changes once after the section enters
      const disp = root.current?.querySelector(".bp-dispo-value");
      if (disp) {
        tl.call(() => {
          disp.textContent = "Appointment Set";
          disp.classList.add("set");
        }, undefined, "+=0.8");
      }

      // Save & Complete: one-time glow
      const save = root.current?.querySelector(".bp-save");
      if (save) {
        tl.fromTo(
          save,
          { boxShadow: "0 0 0 rgba(168,85,247,0)" },
          { boxShadow: "0 0 28px rgba(168,85,247,0.45)", duration: 0.6, yoyo: true, repeat: 1 },
          "-=0.4"
        );
      }
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="bp" id="product" ref={root}>
      <div className="bp-blob" aria-hidden="true" />

      <div className="bp-inner">
        <div className="bp-copy">
          <p className="section-eyebrow bp-eyebrow">BUILT FOR AGENTS</p>
          <h2 className="section-heading bp-heading">
            Calls land right <em>in your browser</em>
          </h2>
          <p className="bp-body">
            No downloads. No desk phones. Just open Coverage Calls and start taking
            inbound calls.
          </p>
          <ul className="check-list bp-list">
            {checklist.map((item) => (
              <li key={item}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8.5 6.2 11.7 13 4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
          <Link className="text-link-arrow bp-link" href="/dashboard">
            View full dashboard <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="bp-browser">
          <div className="browser-bar">
            <span className="traffic-lights" aria-hidden="true">
              <i className="red" />
              <i className="yellow" />
              <i className="green" />
            </span>
            <span className="browser-title">Coverage Calls</span>
          </div>

          <div className="browser-body">
            <div className="browser-side" aria-hidden="true">
              <span className="side-icon active">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M6 5h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-5l-2 3-2-3H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M9 10h6M9 13h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <span className="side-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M3.5 19c.8-3.4 3-5 5.5-5s4.7 1.6 5.5 5M16 8h5M16 12h5M16 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <span className="side-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <span className="side-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
            </div>

            <div className="browser-main">
              <div className="call-card-mini">
                <div className="call-card-head">
                  <span className="call-live">
                    <span className="live-dot" />
                    LIVE CALL
                    <span className="call-timer">• 04:32</span>
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 8h3v8H4zM8.5 5h3v14h-3zM13 9h3v6h-3zM17.5 3h3v18h-3z" fill="currentColor" opacity="0.7" />
                  </svg>
                </div>
                <div className="call-contact">
                  <span className="call-avatar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="9" r="4" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M4.5 20c1.2-4.6 4.2-7 7.5-7s6.3 2.4 7.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div>
                    <strong>Medicare Prospect</strong>
                    <small>Dallas, TX • Via Web Lead</small>
                  </div>
                </div>
                <div className="bp-tags">
                  <span className="tag tag-purple">Medicare Advantage</span>
                  <span className="tag tag-purple">Plan Switch</span>
                </div>
                <Waveform bars={26} />
                <div className="call-controls">
                  <button type="button" className="call-ctl">
                    Mute
                  </button>
                  <button type="button" className="call-ctl">
                    Hold
                  </button>
                  <button type="button" className="call-ctl">
                    Keypad
                  </button>
                  <button type="button" className="call-ctl end">
                    End Call
                  </button>
                </div>
              </div>
            </div>

            <div className="browser-notes">
              <h3 className="notes-title">Call Notes</h3>
              <ul className="bp-callnotes">
                {notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <h3 className="notes-title">Disposition</h3>
              <div className="bp-dispo">
                <span className="bp-dispo-value">Qualifying…</span>
                <svg width="11" height="7" viewBox="0 0 11 7" fill="none" aria-hidden="true">
                  <path d="m1 1 4.5 4.5L10 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <button type="button" className="bp-save">
                Save &amp; Complete
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
