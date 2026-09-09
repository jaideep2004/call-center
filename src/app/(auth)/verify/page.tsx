"use client";

import { useState, useId } from "react";
import Link from "next/link";
import { showToast } from "@/lib/use-toast";

export default function VerifyPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const errorId = useId();
  const successId = useId();
  const [inlineError, setInlineError] = useState("");

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setInlineError("");
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      const msg = "Enter your registration email";
      setInlineError(msg);
      showToast(msg, "error");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, callbackURL: "/dashboard" }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (res.ok) {
        setSent(true);
        showToast("Verification email re-sent — check inbox & spam", "success");
      } else {
        const msg = body.message ?? "Failed to resend — try logging in";
        setInlineError(msg);
        showToast(msg, "error");
      }
    } catch {
      const msg = "Network error — please try again";
      setInlineError(msg);
      showToast(msg, "error");
    }
    setSending(false);
  }

  return (
    <>
      <div className="auth-card__head">
        <p className="auth-card__eyebrow">Verify — 03</p>
        <h1 className="auth-card__title">Verify your email</h1>
        <p className="auth-card__subtitle">We sent a verification link to your email. Click it to activate your account.</p>
      </div>

      <div className="auth-success" role="status" aria-live="polite">
        Registration successful. Check your inbox and click the verification link to verify your account.
        <br />
        <span style={{ opacity: 0.75, fontSize: 11 }}>Did not arrive? Check spam, or resend below.</span>
      </div>

      <form onSubmit={handleResend} noValidate className="auth-form" style={{ marginTop: 8 }}>
        <div className="form-group">
          <label className="form-label" htmlFor="resend-email">
            Resend verification link
          </label>
          <div className="auth-inline-row">
            <input
              id="resend-email"
              name="email"
              className="input"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCorrect="off"
              spellCheck={false}
              placeholder="you@publisher.com…"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              aria-invalid={Boolean(inlineError) || undefined}
              aria-describedby={inlineError ? errorId : sent ? successId : undefined}
            />
            <button className="btn btn-secondary" type="submit" disabled={sending} aria-busy={sending} style={{ minWidth: 108 }}>
              {sending ? (
                <>
                  <span className="spinner" aria-hidden="true" style={{ width: 14, height: 14 }} />
                  <span>Sending…</span>
                </>
              ) : sent ? (
                "Re-sent ✓"
              ) : (
                "Resend"
              )}
            </button>
          </div>
          {inlineError && (
            <div id={errorId} className="auth-hint auth-hint--error" role="alert" aria-live="polite">
              {inlineError}
            </div>
          )}
          {sent && !inlineError && (
            <p id={successId} className="auth-hint" role="status" aria-live="polite">
              If the address exists, a new link is on the way (expires in 1 hour).
            </p>
          )}
          {!sent && !inlineError && <p className="auth-hint">We will resend to the address you registered with.</p>}
        </div>
      </form>

      <div className="auth-footer" style={{ flexDirection: "column", gap: 10, alignItems: "center" }}>
        <Link href="/login">Go to sign in</Link>
        <span className="auth-hint" style={{ textAlign: "center" }}>
          Already verified?{" "}
          <Link href="/login" style={{ color: "#C4B5FD" }}>
            Sign in directly
          </Link>
        </span>
      </div>
    </>
  );
}
