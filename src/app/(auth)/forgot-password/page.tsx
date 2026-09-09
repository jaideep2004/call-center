"use client";

import { useState, FormEvent, useId } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorId = useId();
  const successId = useId();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: forgotError } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: "/reset-password",
    });
    setLoading(false);
    if (forgotError) {
      setError(forgotError.message ?? "Failed to send reset email");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <>
        <div className="auth-card__head">
          <p className="auth-card__eyebrow">Check your email — 02</p>
          <h1 className="auth-card__title">Check your email</h1>
          <p className="auth-card__subtitle">If an account exists for {email}, you will receive a reset link.</p>
        </div>
        <div id={successId} className="auth-success" role="status" aria-live="polite">
          If an account exists for <strong style={{ color: "#fff", wordBreak: "break-all" }}>{email}</strong>, you will receive a
          password reset link. The link expires in 1 hour.
        </div>
        <p className="auth-hint" style={{ marginTop: 10 }}>
          Did not arrive? Check spam and promotions, or try again in a minute.
        </p>
        <div className="auth-footer">
          <Link href="/login">Back to sign in</Link>
        </div>
      </>
    );
  }

  const hasError = Boolean(error);

  return (
    <>
      <div className="auth-card__head">
        <p className="auth-card__eyebrow">Reset password — 02</p>
        <h1 className="auth-card__title">Reset password</h1>
        <p className="auth-card__subtitle">Enter your email to receive a reset link.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {hasError && (
          <div id={errorId} className="auth-error" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCorrect="off"
            spellCheck={false}
            placeholder="you@agency.com…"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-required="true"
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? errorId : undefined}
            autoFocus
          />
          <p className="auth-hint">We will email you a one-time reset link.</p>
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading} aria-busy={loading}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              <span>Sending…</span>
            </>
          ) : (
            "Send reset link"
          )}
        </button>
      </form>

      <div className="auth-footer">
        <Link href="/login">Back to sign in</Link>
      </div>
    </>
  );
}
