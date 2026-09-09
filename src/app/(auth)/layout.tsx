"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useToast } from "@/lib/use-toast";
import "@/styles/auth.css";

const EDITORIAL: Record<string, { eyebrow: string; headline: React.ReactNode; lede: string }> = {
  "/login": {
    eyebrow: "01 — ACCESS",
    headline: (
      <>
        Where every
        <br />
        call finds
        <br />
        <em>its answer.</em>
      </>
    ),
    lede: "Coverage Calls routes verified inbound calls to your team in real time. Sign in to your operations console.",
  },
  "/register": {
    eyebrow: "01 — BEGIN",
    headline: (
      <>
        Start taking
        <br />
        better <em>calls.</em>
      </>
    ),
    lede: "Create your operations account. Verified routing, browser answering, and billing — ready in minutes.",
  },
  "/forgot-password": {
    eyebrow: "02 — RECOVER",
    headline: (
      <>
        Get back
        <br />
        to <em>work.</em>
      </>
    ),
    lede: "We will send a secure reset link to your email. It expires in 1 hour and can be used once.",
  },
  "/reset-password": {
    eyebrow: "02 — SECURE",
    headline: (
      <>
        Set a new
        <br />
        <em>password.</em>
      </>
    ),
    lede: "Choose a strong password you have not used elsewhere. You will be redirected to sign in afterwards.",
  },
  "/verify": {
    eyebrow: "03 — VERIFY",
    headline: (
      <>
        Check your
        <br />
        <em>inbox.</em>
      </>
    ),
    lede: "We sent a verification link to your email. Click it to activate your account — check spam if you do not see it.",
  },
};

const DEFAULT_ED = {
  eyebrow: "01 — ACCESS",
  headline: (
    <>
      Operations
      <br />
      for teams that
      <br />
      <em>close.</em>
    </>
  ),
  lede: "The inbound call platform for agents and agencies who want better conversations and better results.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { toasts, dismiss } = useToast();
  const pathname = usePathname();
  const ed = (pathname && EDITORIAL[pathname]) || DEFAULT_ED;

  return (
    <div className="auth-shell">
      <a href="#auth-main" className="auth-skip">
        Skip to content
      </a>

      <div className="auth-split">
        {/* Editorial — left */}
        <div className="auth-editorial" aria-label="Coverage Calls editorial">
          <div className="auth-editorial__top">
            <Link className="wordmark" href="/" aria-label="Coverage Calls home">
              COVERAGE CALLS<span aria-hidden="true">▲</span>
            </Link>
            <span
              style={{
                font: "11px var(--mono)",
                letterSpacing: "1px",
                color: "#6F6790",
                whiteSpace: "nowrap",
              }}
            >
              Est. 2025
            </span>
          </div>

          <div className="auth-editorial__eyebrow" aria-hidden="true">
            {ed.eyebrow}
          </div>

          <h1 className="auth-editorial__headline">{ed.headline}</h1>
          <p className="auth-editorial__lede">{ed.lede}</p>

          <ul className="auth-editorial__rules" role="list" aria-label="How it works">
            <li className="auth-editorial__rule">
              <span className="auth-editorial__rule-num" aria-hidden="true">
                01
              </span>
              <span className="auth-editorial__rule-body">
                <strong>Route — verified inbound, instantly</strong>
                <span>Every call is verified and routed to the right closer in real time.</span>
              </span>
            </li>
            <li className="auth-editorial__rule">
              <span className="auth-editorial__rule-num" aria-hidden="true">
                02
              </span>
              <span className="auth-editorial__rule-body">
                <strong>Answer — in your browser</strong>
                <span>Zero friction softphone. No extra hardware, no missed handoffs.</span>
              </span>
            </li>
            <li className="auth-editorial__rule">
              <span className="auth-editorial__rule-num" aria-hidden="true">
                03
              </span>
              <span className="auth-editorial__rule-body">
                <strong>Close — track and scale</strong>
                <span>Dispositions, billing, and payouts — one console to run the operation.</span>
              </span>
            </li>
          </ul>

          <div className="auth-editorial__trust" aria-label="Trust signals">
            <span>
              <i className="auth-editorial__trust-dot" aria-hidden="true" />
              Trusted by growing teams
            </span>
            <span aria-hidden="true">·</span>
            <span>4.9/5 average rating</span>
            <span aria-hidden="true">·</span>
            <span>Setup in minutes</span>
          </div>

          <div className="auth-editorial__ornament" aria-hidden="true" />
        </div>

        {/* Card — right */}
        <div className="auth-card-wrap">
          <main id="auth-main" className="auth-card" tabIndex={-1} aria-label="Authentication">
            {children}
          </main>
          <p className="auth-meta">
            © 2025 Coverage Calls{" "}
            <span aria-hidden="true" style={{ opacity: 0.5 }}>
              ·
            </span>{" "}
            <Link href="/privacy">Privacy</Link>{" "}
            <span aria-hidden="true" style={{ opacity: 0.5 }}>
              ·
            </span>{" "}
            <Link href="/terms">Terms</Link>{" "}
            <span aria-hidden="true" style={{ opacity: 0.5 }}>
              ·
            </span>{" "}
            <Link href="/contact">Contact</Link>
          </p>
        </div>
      </div>

      {/* Toasts — aria-live polite, per web-interface-guidelines */}
      {toasts.length > 0 && (
        <div className="auth-toasts" aria-live="polite" aria-atomic="true">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className={`toast ${t.type === "success" ? "toast-success" : ""}${t.type === "error" ? "toast-error" : ""}`}
              onClick={() => dismiss(t.id)}
              style={{ cursor: "pointer" }}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
