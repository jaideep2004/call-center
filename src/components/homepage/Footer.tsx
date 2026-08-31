"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { useRef } from "react";
import { gsap, ScrollTrigger, useIsomorphicLayoutEffect, prefersReducedMotion } from "@/lib/animations";

const columns = [
  {
    title: "Product",
    links: ["Features", "Integrations", "Security", "Roadmap"],
  },
  {
    title: "Solutions",
    links: ["Agents", "Agencies", "Insurance", "Call Centers"],
  },
  {
    title: "Resources",
    links: ["Blog", "Help Center", "Guides", "API Docs"],
  },
  {
    title: "Company",
    links: ["About Us", "Careers", "Contact", "Privacy Policy"],
  },
];

const socials = [
  {
    name: "LinkedIn",
    path: "M4.5 3.5h15a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Zm3 15v-7.5H5V18.5h2.5ZM6.25 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM19 18.5v-4.1c0-2.2-1.2-3.2-2.8-3.2-1.3 0-1.9.7-2.2 1.2V11H11.5v7.5H14v-3.7c0-1 .5-1.6 1.3-1.6.8 0 1.2.5 1.2 1.6v3.7H19Z",
  },
  {
    name: "X",
    path: "M17.7 3H21l-7.3 8.4L22.2 21h-6.7l-5.3-6.2L4.2 21H1l7.8-9L1.5 3h6.9l4.8 5.7L17.7 3Zm-1.2 16h1.9L7.1 4.9H5.1L16.5 19Z",
  },
  {
    name: "Instagram",
    path: "M12 8.4A3.6 3.6 0 1 0 12 15.6 3.6 3.6 0 0 0 12 8.4Zm0 5.9a2.3 2.3 0 1 1 0-4.6 2.3 2.3 0 0 1 0 4.6ZM16.8 8.2a.9.9 0 1 1-1.8 0 .9.9 0 0 1 1.8 0ZM8.6 3.9h6.8a4.7 4.7 0 0 1 4.7 4.7v6.8a4.7 4.7 0 0 1-4.7 4.7H8.6a4.7 4.7 0 0 1-4.7-4.7V8.6a4.7 4.7 0 0 1 4.7-4.7Zm0 1.7a3 3 0 0 0-3 3v6.8a3 3 0 0 0 3 3h6.8a3 3 0 0 0 3-3V8.6a3 3 0 0 0-3-3H8.6Z",
  },
  {
    name: "YouTube",
    path: "M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26.5 26.5 0 0 0 2 12c0 1.6.1 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.7 19 12 19 12 19s6.3 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.3-1.6.4-3.2.4-4.8s-.1-3.2-.4-4.8ZM10 15.2V8.8l5.2 3.2L10 15.2Z",
  },
];

export function Footer() {
  const root = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const reduced = prefersReducedMotion();
      if (reduced) return;
      gsap.from(".footer-inner", {
        y: 12,
        opacity: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: root.current, start: "top 90%", once: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <footer className="site-footer" ref={root}>
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo size={28} />
          <p>
            The inbound call platform for agents and agencies who want better
            conversations and better results.
          </p>
          <div className="footer-socials">
            {socials.map((s) => (
              <a key={s.name} href="#" aria-label={s.name} className="footer-social">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>

        <div className="footer-cols">
          {columns.map((col) => (
            <div key={col.title} className="footer-col">
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-newsletter">
          <h4>Stay updated</h4>
          <p>Get product updates and tips to grow your business.</p>
          <form className="footer-form" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="footer-email" className="sr-only">
              Email address
            </label>
            <input
              id="footer-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              spellCheck={false}
            />
            <button type="submit" aria-label="Subscribe">
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2025 Coverage Calls. All rights reserved.</span>
        <span className="footer-legal">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </span>
      </div>
    </footer>
  );
}
